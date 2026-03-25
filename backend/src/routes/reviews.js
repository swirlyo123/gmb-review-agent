const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { analyzeSentiment, generateReply } = require('../services/claude');
const { postReply, getValidAccessToken } = require('../services/gmb');
const { triggerPoll } = require('../jobs/pollReviews');

// GET /api/reviews — all reviews across all locations for this tenant
router.get('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { locationId, status, sentiment } = req.query;

  if (!tenantId) {
    return res.json({ reviews: getMockReviews(), counts: getMockCounts(), source: 'mock' });
  }

  try {
    // Get all active location IDs for this tenant
    const locationFilter = { tenantId, isActive: true };
    if (locationId) locationFilter.id = locationId;

    const locations = await prisma.location.findMany({ where: locationFilter });
    const locationIds = locations.map((l) => l.id);

    if (!locationIds.length) {
      return res.json({ reviews: [], counts: buildCounts([]), source: 'db', message: 'No locations configured' });
    }

    // Build review query
    const reviewWhere = { locationId: { in: locationIds } };
    if (sentiment) reviewWhere.sentiment = sentiment;
    if (status === 'pending') reviewWhere.replyPosted = false;
    if (status === 'replied') reviewWhere.replyPosted = true;
    if (status === 'needs_attention') {
      reviewWhere.sentiment = 'negative';
      reviewWhere.replyPosted = false;
    }

    const reviews = await prisma.review.findMany({
      where: reviewWhere,
      include: { location: { select: { id: true, name: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Shape response
    const shaped = reviews.map((r) => ({
      id: r.id,
      gmbReviewId: r.gmbReviewId,
      authorName: r.authorName,
      starRating: r.starRating,
      comment: r.comment,
      sentiment: r.sentiment,
      urgency: r.urgency,
      autoReply: r.autoReply,
      replyPosted: r.replyPosted,
      approvedAt: r.approvedAt,
      createdAt: r.createdAt,
      locationId: r.locationId,
      locationName: r.location.name,
      locationAddress: r.location.address,
    }));

    res.json({
      reviews: shaped,
      counts: buildCounts(shaped),
      source: 'db',
      locations: locations.map((l) => ({ id: l.id, name: l.name })),
    });
  } catch (err) {
    console.error('❌ GET /api/reviews error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:id/approve — approve AI reply and post to GMB
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { replyText } = req.body;
  const tenantId = req.headers['x-tenant-id'];

  console.log(`✅ POST /api/reviews/${id}/approve`);

  if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header required' });

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      include: { location: { include: { tenant: true } } },
    });

    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.replyPosted) return res.json({ success: true, message: 'Already replied' });

    const replyToPost = replyText || review.autoReply;
    if (!replyToPost) return res.status(400).json({ error: 'No reply text to post' });

    // Demo location — mark as replied in DB without hitting GMB API
    if (review.location.gmbLocationId === 'demo-mock-location') {
      const updated = await prisma.review.update({
        where: { id },
        data: { replyPosted: true, autoReply: replyToPost, approvedAt: new Date() },
      });
      console.log(`✅ Demo review approved (GMB API pending quota approval)`);
      return res.json({ success: true, demo: true, message: 'Saved locally — will post to Google once GMB quota is approved', review: updated });
    }

    const tenant = review.location.tenant;
    const accessToken = await getValidAccessToken(tenant);

    await postReply(
      accessToken,
      review.location.gmbLocationId,
      review.gmbReviewId,
      replyToPost
    );

    const updated = await prisma.review.update({
      where: { id },
      data: {
        replyPosted: true,
        autoReply: replyToPost,
        approvedAt: new Date(),
      },
    });

    console.log(`✅ Reply approved and posted to GMB for review ${id}`);
    res.json({ success: true, review: updated });
  } catch (err) {
    console.error('❌ approve error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:id/regenerate — regenerate AI reply
router.post('/:id/regenerate', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.headers['x-tenant-id'];

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      include: { location: true },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const reply = await generateReply(review.comment, review.starRating, review.location.name);
    const sentiment = await analyzeSentiment(review.comment, review.starRating);

    const updated = await prisma.review.update({
      where: { id },
      data: {
        autoReply: reply,
        sentiment: sentiment.sentiment,
        urgency: sentiment.urgency,
      },
    });

    res.json({ success: true, review: updated, reply, sentiment });
  } catch (err) {
    console.error('❌ regenerate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/trigger-poll
router.post('/trigger-poll', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  console.log(`🚀 POST /api/reviews/trigger-poll`);
  try {
    const stats = await triggerPoll(tenantId || null);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('❌ trigger-poll error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/analyze — one-off test
router.post('/analyze', async (req, res) => {
  const { reviewText, starRating, businessName } = req.body;
  if (!reviewText || !starRating) {
    return res.status(400).json({ error: 'reviewText and starRating are required' });
  }
  try {
    const sentiment = await analyzeSentiment(reviewText, starRating);
    const reply = await generateReply(reviewText, starRating, businessName || 'Our Business');
    res.json({ sentiment, reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildCounts(reviews) {
  return {
    total: reviews.length,
    positive: reviews.filter((r) => r.sentiment === 'positive').length,
    negative: reviews.filter((r) => r.sentiment === 'negative').length,
    neutral: reviews.filter((r) => r.sentiment === 'neutral').length,
    pendingApproval: reviews.filter((r) => !r.replyPosted && r.autoReply).length,
    needsAttention: reviews.filter((r) => r.sentiment === 'negative' && !r.replyPosted).length,
    replied: reviews.filter((r) => r.replyPosted).length,
  };
}

function getMockCounts() {
  return buildCounts(getMockReviews());
}

function getMockReviews() {
  return [
    { id: 'mock_1', gmbReviewId: 'g1', authorName: 'Sarah Johnson', starRating: 5, comment: 'Absolutely loved this place! The mango froyo was incredible.', sentiment: 'positive', urgency: 'low', autoReply: "Thank you so much, Sarah! The mango is a fan favourite — so glad you loved it. See you again soon!", replyPosted: false, locationName: 'SWIRLYO Demo', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'mock_2', gmbReviewId: 'g2', authorName: 'Mark Thompson', starRating: 2, comment: 'Waited 30 minutes and the order was wrong. Very disappointed.', sentiment: 'negative', urgency: 'high', autoReply: "Hi Mark, we're really sorry about this experience — this isn't the standard we hold ourselves to. Please reach out to us directly so we can make it right.", replyPosted: false, locationName: 'SWIRLYO Demo', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 'mock_3', gmbReviewId: 'g3', authorName: 'Lisa Chen', starRating: 4, comment: 'Great froyo and friendly staff! Could use more seating.', sentiment: 'positive', urgency: 'low', autoReply: "Thanks Lisa! We appreciate the feedback on seating — we're always looking to improve the experience. Hope to see you back soon!", replyPosted: true, approvedAt: new Date(Date.now() - 1 * 3600000).toISOString(), locationName: 'SWIRLYO Demo', createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: 'mock_4', gmbReviewId: 'g4', authorName: 'David Park', starRating: 3, comment: 'It was okay. Nothing special, nothing terrible.', sentiment: 'neutral', urgency: 'low', autoReply: "Thanks for visiting, David! We'd love to make your next visit a great one — come say hi to the team.", replyPosted: false, locationName: 'SWIRLYO Demo', createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
  ];
}

module.exports = router;
