const cron = require('node-cron');
const { notifyAll } = require('../services/delivery');
const { analyzeSentiment, generateReply } = require('../services/claude');

// Demo review used to test the notification pipeline when a new review is detected
const DEMO_REVIEW = {
  starRating: 2,
  authorName: 'Jane Doe',
  comment:
    'The food was okay but the service was really slow. We waited 40 minutes for our order and nobody apologized.',
  businessName: process.env.BUSINESS_NAME || 'Our Business',
};

async function pollGMBReviews() {
  console.log('🔄 Polling GMB for new reviews...');

  // Phase 2: Replace this with actual GMB API call per tenant
  // const reviews = await getLocationReviews(accessToken, accountId, locationId);

  // Demo mode: simulate detecting a new review
  const newReviews = []; // Set to [DEMO_REVIEW] to test the full notification pipeline

  if (newReviews.length === 0) {
    console.log('✅ No new reviews found this cycle.');
    return;
  }

  console.log(`📬 Found ${newReviews.length} new review(s). Processing...`);

  for (const review of newReviews) {
    try {
      console.log(`\n🔍 Processing review from ${review.authorName} (${review.starRating}⭐)...`);

      const sentiment = await analyzeSentiment(review.comment, review.starRating);
      const reply = await generateReply(review.comment, review.starRating, review.businessName);

      console.log(`📣 Sentiment: ${sentiment.sentiment} | Urgency: ${sentiment.urgency}`);
      await notifyAll(review, sentiment, reply);

      console.log(`✅ Review from ${review.authorName} fully processed.\n`);
    } catch (err) {
      console.error(`❌ Error processing review from ${review.authorName}:`, err.message);
    }
  }
}

function startPolling() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', pollGMBReviews);
  console.log('⏰ GMB poll job scheduled: every 15 minutes');

  // Uncomment the line below to run once immediately on startup (useful for testing)
  // pollGMBReviews();
}

module.exports = { startPolling, pollGMBReviews };
