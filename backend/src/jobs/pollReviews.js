const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { getReviews, getValidAccessToken } = require('../services/gmb');
const { analyzeSentiment, generateReply } = require('../services/claude');

const prisma = new PrismaClient();

// Poll every active location across every tenant
async function pollAllLocations() {
  console.log('\n🔄 === Poll cycle starting ===');

  const locations = await prisma.location.findMany({
    where: { isActive: true },
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

function startPolling() {
  cron.schedule('*/15 * * * *', pollAllLocations);
  console.log('⏰ GMB poll job scheduled: every 15 minutes');
}

// Manual trigger — run one cycle now and return stats
async function triggerPoll(tenantId) {
  console.log(`🚀 Manual poll triggered — tenant: ${tenantId || 'all'}`);

  if (tenantId) {
    const locations = await prisma.location.findMany({
      where: { tenantId, isActive: true },
      include: { tenant: true },
    });

    if (!locations.length) throw new Error('No active locations found for this tenant');

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
