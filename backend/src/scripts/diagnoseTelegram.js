require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const axios = require('axios');

async function diagnoseTelegram() {
  console.log('\n🔍 ======= TELEGRAM DIAGNOSTICS =======');

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TEST_TELEGRAM_CHAT_ID;

  // ── 1. Validate env vars ──────────────────────────────────────────────────
  if (!token)  { console.error('❌ TELEGRAM_BOT_TOKEN is missing from .env'); process.exit(1); }
  if (!chatId) { console.error('❌ TEST_TELEGRAM_CHAT_ID is missing from .env'); process.exit(1); }
  console.log(`✅ TELEGRAM_BOT_TOKEN: set (${token.slice(0, 10)}...)`);
  console.log(`✅ TEST_TELEGRAM_CHAT_ID: ${chatId}`);

  const base = `https://api.telegram.org/bot${token}`;

  // ── 2. Verify token ───────────────────────────────────────────────────────
  console.log('\n📡 Checking bot token...');
  try {
    const res = await axios.get(`${base}/getMe`);
    if (!res.data.ok) { console.error('❌ Token invalid — ok=false'); process.exit(1); }
    const bot = res.data.result;
    console.log(`✅ Telegram token valid`);
    console.log(`   Bot: ${bot.first_name} (@${bot.username}) — id ${bot.id}`);
  } catch (err) {
    console.error('❌ Token invalid:', err.message);
    process.exit(1);
  }

  // ── 3. Check for pending messages ────────────────────────────────────────
  console.log('\n📬 Checking getUpdates...');
  try {
    const res = await axios.get(`${base}/getUpdates?offset=-1`);
    const updates = res.data.result;
    if (updates.length) {
      const last = updates[updates.length - 1];
      console.log(`✅ Bot reachable — last message from chat_id: ${last.message?.chat?.id} — "${last.message?.text}"`);
    } else {
      console.log('ℹ️  No pending updates (normal if messages already processed)');
    }
  } catch (err) {
    console.error('❌ getUpdates failed:', err.message);
  }

  // ── 4. Send a live test message ───────────────────────────────────────────
  console.log(`\n📤 Sending test message to chat ${chatId}...`);
  try {
    const res = await axios.post(`${base}/sendMessage`, {
      chat_id: chatId,
      text:
        `🧪 Telegram Diagnostic Test\n\n` +
        `Token: valid ✅\n` +
        `Chat ID: ${chatId} ✅\n` +
        `Bot: @Swirlyoreviewaibot ✅\n\n` +
        `You will receive review alerts here.`,
      parse_mode: 'HTML',
    });
    console.log(`✅ Message sent successfully — message_id: ${res.data.result.message_id}`);
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('❌ Send failed:', JSON.stringify(detail));
  }

  console.log('\n🔍 ======= DIAGNOSTICS COMPLETE =======\n');
}

diagnoseTelegram();
