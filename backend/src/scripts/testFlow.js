require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { prisma }            = require('../lib/prisma');
const { analyzeSentiment, generateReply } = require('../services/claude');
const { notifyAll }         = require('../services/delivery');

// Unique ID for today's test run — prevents duplicate row on server restart
const TEST_REVIEW_ID = `auto-test-${new Date().toISOString().slice(0, 10)}`;

async function runAutoTest(tenantId) {
  console.log('\n🧪 ============ AUTO TEST FLOW ============');

  // ── 1. Find a location to attach the test review to ──────────────────────
  const location = await prisma.location.findFirst({ where: { tenantId } });
  if (!location) {
    console.log('⚠️  Auto test skipped — no location found for tenant');
    return;
  }
  console.log(`📍 Using location: ${location.name}`);

  // ── 2. Guard: skip if today's test review already exists ─────────────────
  const existing = await prisma.review.findUnique({ where: { gmbReviewId: TEST_REVIEW_ID } });
  if (existing) {
    console.log(`⏭️  Auto test already ran today (${TEST_REVIEW_ID}) — skipping`);
    return;
  }

  // ── 3. Simulate a bad 1-star review ──────────────────────────────────────
  const testText   = 'Very bad experience. Staff was rude and the yogurt was completely melted. Never coming back.';
  const testStars  = 1;
  const testAuthor = '[Auto Test]';

  console.log(`📝 Test review: ${testStars}⭐ — "${testText}"`);

  // ── 4. Run real Claude AI sentiment + reply ───────────────────────────────
  console.log('🤖 Calling Claude AI...');
  let sentiment, reply;
  try {
    sentiment = await analyzeSentiment(testText, testStars);
    reply     = await generateReply(testText, testStars, location.name);
    console.log(`✅ Sentiment: ${sentiment.sentiment} | Urgency: ${sentiment.urgency}`);
    console.log(`✅ Reply (${reply.length} chars): ${reply.slice(0, 80)}...`);
  } catch (err) {
    console.error('❌ Claude AI failed:', err.message);
    return;
  }

  // ── 5. Save to DB ─────────────────────────────────────────────────────────
  const saved = await prisma.review.create({
    data: {
      locationId:  location.id,
      gmbReviewId: TEST_REVIEW_ID,
      authorName:  testAuthor,
      starRating:  testStars,
      comment:     testText,
      sentiment:   sentiment.sentiment,
      urgency:     sentiment.urgency,
      autoReply:   reply,
      replyPosted: false,
    },
  });
  console.log(`💾 Saved to DB with id: ${saved.id}`);

  // ── 6. Fire notifications via all enabled channels ────────────────────────
  const deliveryConfig = await prisma.deliveryConfig.findUnique({ where: { tenantId } });
  if (!deliveryConfig) {
    console.log('ℹ️  No delivery config — skipping notification (configure in Settings)');
  } else {
    console.log('📣 Firing notifyAll()...');
    try {
      await notifyAll(
        { starRating: testStars, authorName: testAuthor, comment: testText },
        sentiment,
        reply,
        deliveryConfig
      );
    } catch (err) {
      console.error('❌ notifyAll failed:', err.message);
    }
  }

  console.log('✅ Auto test completed. Review appears on dashboard under Needs Attention.');
  console.log('🧪 ==========================================\n');
}

module.exports = { runAutoTest };

// Allow running directly: node src/scripts/testFlow.js
if (require.main === module) {
  (async () => {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('❌ No tenant in DB — run the OAuth flow first');
      process.exit(1);
    }
    console.log(`👤 Using tenant: ${tenant.businessName} (${tenant.id})`);
    await runAutoTest(tenant.id);
    await prisma.$disconnect();
  })();
}
