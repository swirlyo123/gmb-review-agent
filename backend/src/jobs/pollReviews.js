const cron = require('node-cron');
const { prisma } = require('../lib/prisma');
const { getReviews, getValidAccessToken } = require('../services/gmb');
const { analyzeSentiment, generateReply } = require('../services/claude');
const { notifyAll } = require('../services/delivery');
const { sendDailyDigest } = require('../services/digest');

// Poll every active location across every tenant
async function pollAllLocations() {
  console.log('\n🔄 === Poll cycle starting ===');

  const locations = await prisma.location.findMany({
    where: { isActive: true, NOT: { gmbLocationId: 'demo-mock-location' } },
    include: { tenant: true },
  });

  console.log(`📍 Polling ${locations.length} active location(s)...`);

  const stats = { locations: locations.length, newReviews: 0, errors: 0 };

  for (const location of locations) {
    try {
      const result = await pollLocation(location);
      stats.newReviews += result.newReviews;
    } catch (err) {
      console.error(`❌ Error polling ${location.name}:`, err.message);
      stats.errors++;
    }
  }

  console.log(`\n✅ Poll done. New reviews: ${stats.newReviews} | Errors: ${stats.errors}\n`);
  return stats;
}

async function pollLocation(location) {
  console.log(`\n🏪 Polling: ${location.name}`);
  const tenant = location.tenant;

  const accessToken = await getValidAccessToken(tenant);
  const gmbReviews = await getReviews(accessToken, location.gmbLocationId);

  console.log(`📬 ${gmbReviews.length} review(s) from GMB`);

  let newReviewCount = 0;

  for (const gmbReview of gmbReviews) {
    const gmbReviewId = gmbReview.reviewId || gmbReview.name;

    const existing = await prisma.review.findUnique({ where: { gmbReviewId } });
    if (existing) continue;

    newReviewCount++;
    const starRating = parseStarRating(gmbReview.starRating);
    const comment = gmbReview.comment || '';
    const authorName = gmbReview.reviewer?.displayName || 'Anonymous';

    console.log(`\n🆕 New review: ${authorName} (${starRating}⭐) at ${location.name}`);

    // Run AI analysis
    let sentiment = null;
    let reply = null;

    try {
      sentiment = await analyzeSentiment(comment, starRating);
      reply = await generateReply(comment, starRating, location.name);
      console.log(`🤖 Sentiment: ${sentiment.sentiment} | Urgency: ${sentiment.urgency}`);
    } catch (err) {
      console.error(`⚠️ AI pipeline failed for review:`, err.message);
    }

    // Save to DB — NEVER auto-post, always requires approval
    await prisma.review.create({
      data: {
        locationId: location.id,
        gmbReviewId,
        authorName,
        starRating,
        comment,
        sentiment: sentiment?.sentiment || null,
        urgency: sentiment?.urgency || null,
        autoReply: reply || null,
        replyPosted: !!gmbReview.reviewReply, // true only if already replied on GMB
      },
    });

    console.log(`💾 Saved to DB — waiting for approval`);

    // Fire notifications if AI analysis succeeded
    if (sentiment && reply) {
      try {
        const deliveryConfig = await prisma.deliveryConfig.findUnique({ where: { tenantId: tenant.id } });
        await notifyAll({ starRating, authorName, comment }, sentiment, reply, deliveryConfig);
      } catch (err) {
        console.error(`⚠️ Notification failed for review:`, err.message);
      }
    }
  }

  // Update lastPolled on tenant
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { lastPolled: new Date() },
  });

  return { newReviews: newReviewCount };
}

function parseStarRating(starStr) {
  const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[starStr] || parseInt(starStr, 10) || 0;
}

async function sendDailyDigestAll() {
  console.log('\n📊 === Daily digest starting ===');
  try {
    const tenants = await prisma.tenant.findMany({
      include: { deliveryConfig: true },
    });

    for (const tenant of tenants) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reviews = await prisma.review.findMany({
          where: {
            location: { tenantId: tenant.id },
            createdAt: { gte: today },
          },
          include: { location: true },
        });

        if (!reviews.length) {
          console.log(`ℹ️  No reviews today for tenant ${tenant.id}`);
          continue;
        }

        await sendDailyDigest(tenant.id, reviews, tenant.deliveryConfig);
      } catch (err) {
        console.error(`❌ Digest failed for tenant ${tenant.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Daily digest job error:', err.message);
  }
}

function startPolling() {
  cron.schedule('*/15 * * * *', pollAllLocations);
  console.log('⏰ GMB poll job scheduled: every 15 minutes');

  cron.schedule('0 20 * * *', sendDailyDigestAll);
  console.log('⏰ Daily digest scheduled: every day at 20:00');
}

// Demo pipeline — processes mock reviews through real Claude AI, saves to DB
async function pollMockData(tenantId) {
  console.log(`🧪 No locations found — running demo AI pipeline for tenant: ${tenantId}`);

  // Find or create a demo location for this tenant
  let demoLocation = await prisma.location.findFirst({
    where: { tenantId, gmbLocationId: 'demo-mock-location' },
  });

  if (!demoLocation) {
    demoLocation = await prisma.location.create({
      data: {
        tenantId,
        gmbLocationId: 'demo-mock-location',
        name: 'SWIRLYO Demo Store',
        address: 'Demo — connect GMB for real data',
        isActive: true,
      },
    });
    console.log(`📍 Created demo location for tenant ${tenantId}`);
  }

  const mockReviews = [
    { gmbId: 'demo-review-001', authorName: 'Aarav Sharma',  stars: 5, text: 'Best frozen yogurt in Bangalore! The mango flavor is out of this world. Will definitely be back with the whole family!' },
    { gmbId: 'demo-review-002', authorName: 'Priya Mehta',   stars: 2, text: 'Waited 25 minutes for my order and it was still wrong. Staff seemed completely disorganized. Very disappointing experience.' },
    { gmbId: 'demo-review-003', authorName: 'Rohan Kapoor',  stars: 4, text: 'Great flavors and nice ambiance. A bit pricey but worth it as a treat. Loved the toppings bar!' },
  ];

  let newFound = 0;
  let processed = 0;

  for (const mock of mockReviews) {
    const existing = await prisma.review.findUnique({ where: { gmbReviewId: mock.gmbId } });
    if (existing) { console.log(`⏭️  Already in DB: ${mock.authorName}`); continue; }

    newFound++;
    console.log(`\n🆕 Demo review: ${mock.authorName} (${mock.stars}⭐)`);

    let sentiment = null;
    let reply = null;

    try {
      sentiment = await analyzeSentiment(mock.text, mock.stars);
      reply = await generateReply(mock.text, mock.stars, demoLocation.name);
      console.log(`🤖 Sentiment: ${sentiment.sentiment} | Urgency: ${sentiment.urgency}`);
      processed++;
    } catch (err) {
      console.error(`⚠️  AI pipeline failed for demo review:`, err.message);
    }

    await prisma.review.create({
      data: {
        locationId:  demoLocation.id,
        gmbReviewId: mock.gmbId,
        authorName:  mock.authorName,
        starRating:  mock.stars,
        comment:     mock.text,
        sentiment:   sentiment?.sentiment || null,
        urgency:     sentiment?.urgency   || null,
        autoReply:   reply || null,
        replyPosted: false,
      },
    });

    console.log(`💾 Saved to DB — waiting for approval`);
  }

  console.log(`\n✅ Demo poll done. New: ${newFound} | AI processed: ${processed}`);
  return { newReviews: newFound, processed, locations: 1, demo: true };
}

// Manual trigger — run one cycle now and return stats
async function triggerPoll(tenantId) {
  console.log(`🚀 Manual poll triggered — tenant: ${tenantId || 'all'}`);

  if (tenantId) {
    const locations = await prisma.location.findMany({
      where: { tenantId, isActive: true, NOT: { gmbLocationId: 'demo-mock-location' } },
      include: { tenant: true },
    });

    // No real GMB locations yet — run demo pipeline to prove AI works end-to-end
    if (!locations.length) return await pollMockData(tenantId);

    let totalNew = 0;
    for (const loc of locations) {
      const result = await pollLocation(loc);
      totalNew += result.newReviews;
    }
    return { newReviews: totalNew, locations: locations.length };
  }

  return await pollAllLocations();
}

module.exports = { startPolling, triggerPoll };
