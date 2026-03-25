// Run this once after deploying to production:
//   TELEGRAM_WEBHOOK_URL=https://your-domain.com node src/scripts/setWebhook.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const axios = require('axios');

async function setWebhook() {
  const token      = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

  if (!token)      { console.error('❌ TELEGRAM_BOT_TOKEN not set'); process.exit(1); }
  if (!webhookUrl) { console.error('❌ TELEGRAM_WEBHOOK_URL not set (eg: https://your-domain.com)'); process.exit(1); }

  const fullUrl = `${webhookUrl}/api/telegram/webhook`;
  console.log(`🔗 Setting webhook to: ${fullUrl}`);

  const res = await axios.post(
    `https://api.telegram.org/bot${token}/setWebhook`,
    { url: fullUrl, allowed_updates: ['message'] }
  );

  if (res.data.ok) {
    console.log('✅ Webhook set successfully');
  } else {
    console.error('❌ Failed:', res.data.description);
  }
}

setWebhook().catch(console.error);
