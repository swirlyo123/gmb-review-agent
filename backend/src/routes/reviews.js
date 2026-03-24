const express = require('express');
const router = express.Router();
const { analyzeSentiment, generateReply } = require('../services/claude');

// Mock review data until GMB API + DB is wired up in Phase 2
const mockReviews = [
  {
    id: 'rev_001',
    gmbReviewId: 'gmb_001',
    authorName: 'Sarah Johnson',
    starRating: 5,
    comment:
      'Absolutely loved this place! The staff were incredibly friendly and the food was amazing. Will definitely be back!',
    sentiment: 'positive',
    autoReply:
      "Thank you so much, Sarah! We're thrilled you had a wonderful experience — the team will love hearing this. See you next time!",
    replyPosted: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev_002',
    gmbReviewId: 'gmb_002',
    authorName: 'Mark Thompson',
    starRating: 2,
    comment:
      'Really disappointing visit. Waited over 30 minutes and the order was wrong. The manager didn't seem to care.',
    sentiment: 'negative',
    autoReply:
      "Hi Mark, we're truly sorry about your experience — this is not the standard we hold ourselves to. Please reach out to us directly so we can make this right.",
    replyPosted: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev_003',
    gmbReviewId: 'gmb_003',
    authorName: 'Lisa Chen',
    starRating: 4,
    comment:
      'Great experience overall! Food was delicious and the atmosphere was nice. Service could be a little faster but nothing major.',
    sentiment: 'positive',
    autoReply:
      "Thank you, Lisa! So glad you enjoyed the food and atmosphere. We're always working to improve our service speed — appreciate the honest feedback!",
    replyPosted: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev_004',
    gmbReviewId: 'gmb_004',
    authorName: 'David Park',
    starRating: 3,
    comment: 'It was okay. Nothing special, nothing terrible. Average food, average service.',
    sentiment: 'neutral',
    autoReply:
      "Thanks for visiting, David. We appreciate you taking the time to share your thoughts — we'd love to make your next visit a great one!",
    replyPosted: false,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// GET /api/reviews — return all reviews
router.get('/', (req, res) => {
  console.log('📋 GET /api/reviews — returning review list');

  const counts = {
    total: mockReviews.length,
    positive: mockReviews.filter((r) => r.sentiment === 'positive').length,
    negative: mockReviews.filter((r) => r.sentiment === 'negative').length,
    neutral: mockReviews.filter((r) => r.sentiment === 'neutral').length,
    unreplied: mockReviews.filter((r) => !r.replyPosted).length,
  };

  res.json({ reviews: mockReviews, counts });
});

// POST /api/reviews/reply — mark a review as replied
router.post('/reply', (req, res) => {
  const { reviewId, replyText } = req.body;
  console.log(`📝 POST /api/reviews/reply — reviewId: ${reviewId}`);

  if (!reviewId || !replyText) {
    return res.status(400).json({ error: 'reviewId and replyText are required' });
  }

  const review = mockReviews.find((r) => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  review.replyPosted = true;
  review.autoReply = replyText;

  console.log(`✅ Review ${reviewId} marked as replied`);
  res.json({ success: true, review });
});

// POST /api/reviews/analyze — analyze sentiment for a review text (utility endpoint)
router.post('/analyze', async (req, res) => {
  const { reviewText, starRating, businessName } = req.body;
  console.log(`🔍 POST /api/reviews/analyze — analyzing review...`);

  if (!reviewText || !starRating) {
    return res.status(400).json({ error: 'reviewText and starRating are required' });
  }

  try {
    const sentiment = await analyzeSentiment(reviewText, starRating);
    const reply = await generateReply(
      reviewText,
      starRating,
      businessName || 'Our Business'
    );
    res.json({ sentiment, reply });
  } catch (err) {
    console.error('❌ Analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze review', details: err.message });
  }
});

module.exports = router;
