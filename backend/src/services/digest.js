const { sendEmail, sendTelegram, sendWhatsApp } = require('./delivery');

// Generates and sends a daily digest of all reviews for a tenant
async function sendDailyDigest(tenantId, reviews, deliveryConfig) {
  console.log(`📊 Generating daily digest for tenant ${tenantId}...`);

  if (!reviews || reviews.length === 0) {
    console.log('ℹ️  No reviews to digest today.');
    return;
  }

  const total = reviews.length;
  const positive = reviews.filter((r) => r.sentiment === 'positive').length;
  const negative = reviews.filter((r) => r.sentiment === 'negative').length;
  const neutral = reviews.filter((r) => r.sentiment === 'neutral').length;
  const avgRating = (reviews.reduce((sum, r) => sum + r.starRating, 0) / total).toFixed(1);
  const unreplied = reviews.filter((r) => !r.replyPosted).length;

  const digestText =
    `📊 GMB Review Daily Digest\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Total reviews today: ${total}\n` +
    `Average rating: ⭐ ${avgRating}/5\n\n` +
    `Sentiment breakdown:\n` +
    `  ✅ Positive: ${positive}\n` +
    `  ❌ Negative: ${negative}\n` +
    `  ➖ Neutral: ${neutral}\n\n` +
    `⚠️  Unreplied reviews: ${unreplied}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    reviews
      .slice(0, 5)
      .map((r) => `⭐${r.starRating} — ${r.authorName}: "${r.comment?.substring(0, 80)}..."`)
      .join('\n');

  const results = await Promise.allSettled([
    deliveryConfig?.email
      ? sendEmail('📊 Your Daily GMB Review Digest', digestText, deliveryConfig.email)
      : Promise.resolve('Email skipped'),

    deliveryConfig?.telegramChatId
      ? sendTelegram(digestText, deliveryConfig.telegramChatId)
      : Promise.resolve('Telegram skipped'),

    deliveryConfig?.whatsappNumber
      ? sendWhatsApp(digestText, deliveryConfig.whatsappNumber)
      : Promise.resolve('WhatsApp skipped'),
  ]);

  console.log(`✅ Daily digest sent for tenant ${tenantId}`);
  return results;
}

module.exports = { sendDailyDigest };
