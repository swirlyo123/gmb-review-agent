const axios = require('axios');

let offset = 0;
let running = false;

// Long-poll getUpdates — used in local dev when no webhook URL is set.
// Waits up to 30s for new messages, then loops immediately.
async function startTelegramPoller(handleCommand) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('⚠️  Telegram poller skipped — TELEGRAM_BOT_TOKEN not set');
    return;
  }

  if (running) return;
  running = true;
  console.log('📡 Telegram poller started (long-polling getUpdates)');

  async function poll() {
    try {
      const res = await axios.get(
        `https://api.telegram.org/bot${token}/getUpdates`,
        { params: { offset, timeout: 30 }, timeout: 35000 }
      );

      const updates = res.data.result || [];
      for (const update of updates) {
        offset = update.update_id + 1; // advance offset so we never re-process

        const message = update.message;
        if (!message?.text) continue;

        const chatId = message.chat.id;
        const text   = message.text;
        console.log(`📩 Telegram poll — chat ${chatId}: "${text}"`);

        try {
          await handleCommand(chatId, text);
        } catch (err) {
          console.error('❌ Command handler error:', err.message);
        }
      }
    } catch (err) {
      // Network timeout is normal (30s long-poll expiry) — just loop again
      if (!err.message.includes('timeout') && !err.message.includes('ECONNRESET')) {
        console.error('❌ Telegram poller error:', err.message);
      }
    }

    // Loop immediately — no sleep needed, long-poll already waits 30s
    setImmediate(poll);
  }

  poll();
}

module.exports = { startTelegramPoller };
