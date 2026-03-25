require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { prisma }                          = require('../lib/prisma');
const { analyzeSentiment, generateReply } = require('../services/claude');
const { notifyAll }                       = require('../services/delivery');

// Unique ID for today's test run — prevents duplicate row on server restart
const TEST_REVIEW_ID = `auto-test-${new Date().toISOString().slice(0, 10)}`;

// Validate Telegram env vars — returns true if Telegram can send
function telegramReady() {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TEST_TELEGRAM_CHAT_ID;

  if (!token)  { console.warn('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram skipped'); return false; }
  if (!chatId) { console.warn('⚠️  TEST_TELEGRAM_CHAT_ID not set — Telegram skipped'); return false; }
  return true;
}

async function ensureDeliveryConfig(tenantId) {
  const chatId = process.env.TEST_TELEGRAM_CHAT_ID || null;
  const canTelegram = telegramReady();

  const existing = await prisma.deliveryConfig.findUnique({ where: { tenantId } });

  if (!existing) {
    const config = await prisma.deliveryConfig.create({
      data: {
        tenantId,
        telegramEnabled: canTelegram,
        telegramChatId:  chatId,
      },
    });
    console.log(`⚙️  Created DeliveryConfig — Telegram ${canTelegram ? 'ENABLED' : 'skipped (no token/chatId)'}`);
    return config;
  }

  // Always sync telegramChatId from env so env is the source of truth
  const config = await prisma.deliveryConfig.update({
    where: { tenantId },
    data: {
      telegramEnabled: canTelegram,
      telegramChatId:  chatId,
    },
  });
  console.log(`⚙️  Updated DeliveryConfig — Telegram ${canTelegram ? 'ENABLED' : 'skipped (no token/chatId)'}`);
  return config;
}

async function runAutoTest(tenantId) {
  console.log('\n🧪 ============ AUTO TEST FLOW ============');

  // ── 1. Find a location ────────────────────────────────────────────────────
  const location = await prisma.location.findFirst({ where: { tenantId } });
  if (!location) {
    console.log('⚠️  Auto test skipped — no location found for tenant');
    return;
  }
  console.log(`📍 Using location: ${location.name}`);

  // ── 2. Guard: only run once per day ───────────────────────────────────────
  const existing = await prisma.review.findUnique({ where: { gmbReviewId: TEST_REVIEW_ID } });
  if (existing) {
    console.log(`⏭️  Auto test already ran today (${TEST_REVIEW_ID}) — skipping`);
    return;
  }

  // ── 3. Simulate a 1-star review ───────────────────────────────────────────
  const testText   = 'Very bad experience. Staff was rude and the yogurt was completely melted. Never coming back.';
  const testStars  = 1;
  const testAuthor = '[Auto Test]';
  console.log(`📝 Test review: ${testStars}⭐ — "${testText}"`);

  // ── 4. Real Claude AI ─────────────────────────────────────────────────────
  console.log('🤖 Calling Claude AI...');
  let sentiment, reply;
  try {
    sentiment = await analyzeSentiment(testText, testStars);
    reply     = await generateReply(testText, testStars, location.name);
    console.log(`✅ Sentiment: ${sentiment.sentiment} | Urgency: ${sentiment.urgency}`);
    console.log(`✅ Reply: ${reply.slice(0, 80)}...`);
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
  console.log(`💾 Saved to DB — id: ${saved.id}`);

  // ── 6. Auto-configure Telegram from ENV, then notify ─────────────────────
  const deliveryConfig = await ensureDeliveryConfig(tenantId);

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

  console.log('✅ Auto test completed. Check dashboard → Needs Attention.');
  console.log('🧪 ==========================================\n');
}

module.exports = { runAutoTest };

// Run directly: node src/scripts/testFlow.js
if (require.main === module) {
  (async () => {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('❌ No tenant in DB — run the OAuth flow first');
      process.exit(1);
    }
    console.log(`👤 Tenant: ${tenant.businessName} (${tenant.id})`);
    await runAutoTest(tenant.id);
    await prisma.$disconnect();
  })();
}
