const axios = require('axios');
const nodemailer = require('nodemailer');

async function sendWhatsApp(message, phoneNumber) {
  console.log(`📱 Sending WhatsApp notification to ${phoneNumber}...`);

  const response = await axios.post(
    'https://backend.aisensy.com/campaign/t1/api/v2',
    {
      apiKey: process.env.AISENSY_API_KEY,
      campaignName: 'GMB Review Alert',
      destination: phoneNumber,
      userName: 'GMB Review Agent',
      source: 'new-landing-page form',
      media: {},
      templateParams: [message],
      tags: ['gmb-review'],
      attributes: {},
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  console.log(`✅ WhatsApp sent. Status: ${response.status}`);
  return response.data;
}

async function sendTelegram(message, chatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token)  throw new Error('TELEGRAM_BOT_TOKEN not set');
  if (!chatId) throw new Error('Telegram chatId is empty');

  console.log(`📨 Sending Telegram message to chat ${chatId}...`);

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
    });
    console.log(`✅ Telegram sent — message_id: ${response.data.result?.message_id}`);
    return response.data;
  } catch (err) {
    const detail = err.response?.data?.description || err.message;
    throw new Error(`Telegram API error: ${detail}`);
  }
}

async function sendEmail(subject, body, toEmail) {
  console.log(`📧 Sending email to ${toEmail}...`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"GMB Review Agent" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  });

  console.log(`✅ Email sent. Message ID: ${info.messageId}`);
  return info;
}

// notifyAll — sends across all enabled channels for this tenant
// config = DeliveryConfig DB row (or null to fall back to env vars)
async function notifyAll(reviewData, sentiment, reply, config) {
  const { starRating, authorName, comment } = reviewData;

  const urgencyFlag = sentiment.urgency === 'high' ? '🚨 HIGH URGENCY\n' : '';
  const message =
    `${urgencyFlag}⭐ ${starRating}/5 — ${authorName}\n\n` +
    `${comment}\n\n` +
    `Sentiment: ${sentiment.sentiment} | Urgency: ${sentiment.urgency}\n` +
    `📝 ${sentiment.summary}\n\n` +
    `💬 Suggested reply:\n${reply}\n\n` +
    `─────────────────\n` +
    `Reply with:\n` +
    `APPROVE — post to Google\n` +
    `REJECT — discard\n` +
    `SHORTEN — make it shorter\n` +
    `IMPROVE <instruction>\n` +
    `  eg: IMPROVE be more empathetic`;

  console.log('📣 Sending notifications via all enabled channels...');

  // Resolve per-tenant settings, fall back to env vars if no config
  const telegramChatId = (config?.telegramEnabled && config?.telegramChatId)
    ? config.telegramChatId
    : process.env.TELEGRAM_CHAT_ID;

  const whatsappNumber = (config?.whatsappEnabled && config?.whatsappNumber)
    ? config.whatsappNumber
    : process.env.WHATSAPP_NUMBER;

  const emailAddr = (config?.emailEnabled && config?.email)
    ? config.email
    : process.env.EMAIL_TO;

  const results = await Promise.allSettled([
    process.env.AISENSY_API_KEY && whatsappNumber
      ? sendWhatsApp(message, whatsappNumber)
      : Promise.resolve('WhatsApp skipped (no config)'),

    process.env.TELEGRAM_BOT_TOKEN && telegramChatId
      ? sendTelegram(message, telegramChatId)
      : Promise.resolve('Telegram skipped (no config)'),

    process.env.EMAIL_USER && process.env.EMAIL_PASS && emailAddr
      ? sendEmail(`⭐ New ${starRating}-star review from ${authorName}`, message, emailAddr)
      : Promise.resolve('Email skipped (no config)'),
  ]);

  results.forEach((result, idx) => {
    const channels = ['WhatsApp', 'Telegram', 'Email'];
    if (result.status === 'rejected') {
      console.error(`❌ ${channels[idx]} notification failed:`, result.reason?.message);
    } else {
      console.log(`✅ ${channels[idx]}: ${typeof result.value === 'string' ? result.value : 'sent'}`);
    }
  });

  return results;
}

module.exports = { sendWhatsApp, sendTelegram, sendEmail, notifyAll };
