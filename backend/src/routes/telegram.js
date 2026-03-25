const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { generateReply } = require('../services/claude');
const { sendTelegram } = require('../services/delivery');
const { postReply, getValidAccessToken } = require('../services/gmb');

// ── Shared command handler — used by both webhook and local poller ─────────
async function handleCommand(chatId, text) {
  const cmd = text.trim().toLowerCase();

  // Find tenant by chatId
  const config = await prisma.deliveryConfig.findFirst({
    where: { telegramChatId: String(chatId) },
  });

  if (!config) {
    await sendTelegram('No GMB account linked to this chat.', chatId);
    return;
  }

  // Find last pending review for this tenant
  const review = await prisma.review.findFirst({
    where: {
      replyPosted: false,
      location: { tenantId: config.tenantId },
    },
    orderBy: { createdAt: 'desc' },
    include: { location: { include: { tenant: true } } },
  });

  if (!review) {
    await sendTelegram('✅ No pending reviews right now.', chatId);
    return;
  }

  const reviewSnippet = `"${review.comment.slice(0, 60)}..." (${review.starRating}⭐ — ${review.authorName})`;

  // ── APPROVE ───────────────────────────────────────────────────────────────
  if (cmd === 'approve') {
    try {
      const replyText = review.autoReply;
      if (!replyText) {
        await sendTelegram('⚠️ No reply generated yet. Use SHORTEN or IMPROVE first.', chatId);
        return;
      }

      // Demo location — mark locally, don't call GMB API
      if (review.location.gmbLocationId === 'demo-mock-location') {
        await prisma.review.update({
          where: { id: review.id },
          data: { replyPosted: true, approvedAt: new Date() },
        });
        await sendTelegram(
          `✅ Approved (demo mode)\n\n${reviewSnippet}\n\nReply saved. Will post to Google once GMB quota is active.`,
          chatId
        );
        return;
      }

      // Real GMB — post reply
      const accessToken = await getValidAccessToken(review.location.tenant);
      await postReply(accessToken, review.location.gmbLocationId, review.gmbReviewId, replyText);
      await prisma.review.update({
        where: { id: review.id },
        data: { replyPosted: true, approvedAt: new Date() },
      });
      await sendTelegram(`✅ Posted to Google\n\n${reviewSnippet}`, chatId);
    } catch (err) {
      await sendTelegram(`❌ Approve failed: ${err.message}`, chatId);
    }
    return;
  }

  // ── REJECT ────────────────────────────────────────────────────────────────
  if (cmd === 'reject') {
    await prisma.review.update({
      where: { id: review.id },
      data: { autoReply: null },
    });
    await sendTelegram(`❌ Reply discarded\n\n${reviewSnippet}\n\nReview still visible on dashboard.`, chatId);
    return;
  }

  // ── SHORTEN ───────────────────────────────────────────────────────────────
  if (cmd === 'shorten') {
    try {
      await sendTelegram('✍️ Generating shorter reply...', chatId);
      const shortened = await generateReply(
        review.comment + '\n\n[Keep reply under 60 words. Be concise but warm.]',
        review.starRating,
        review.location.name
      );
      await prisma.review.update({ where: { id: review.id }, data: { autoReply: shortened } });
      await sendTelegram(
        `📝 Shortened reply for ${reviewSnippet}:\n\n${shortened}\n\nReply: APPROVE / REJECT / IMPROVE <instruction>`,
        chatId
      );
    } catch (err) {
      await sendTelegram(`❌ Shorten failed: ${err.message}`, chatId);
    }
    return;
  }

  // ── IMPROVE <instruction> ─────────────────────────────────────────────────
  if (cmd.startsWith('improve')) {
    const instruction = text.slice(7).trim();
    if (!instruction) {
      await sendTelegram('Usage: IMPROVE <instruction>\nExample: IMPROVE be more empathetic', chatId);
      return;
    }
    try {
      await sendTelegram(`✍️ Improving reply with: "${instruction}"...`, chatId);
      const improved = await generateReply(
        review.comment + `\n\n[Instruction: ${instruction}]`,
        review.starRating,
        review.location.name
      );
      await prisma.review.update({ where: { id: review.id }, data: { autoReply: improved } });
      await sendTelegram(
        `📝 Updated reply for ${reviewSnippet}:\n\n${improved}\n\nReply: APPROVE / REJECT / SHORTEN / IMPROVE <instruction>`,
        chatId
      );
    } catch (err) {
      await sendTelegram(`❌ Improve failed: ${err.message}`, chatId);
    }
    return;
  }

  // ── Unknown command ────────────────────────────────────────────────────────
  await sendTelegram(
    `Latest pending review:\n${reviewSnippet}\n\nCommands:\nAPPROVE — post to Google\nREJECT — discard reply\nSHORTEN — make it shorter\nIMPROVE <instruction> — eg: IMPROVE be more empathetic`,
    chatId
  );
}

// ── Webhook endpoint: POST /api/telegram/webhook ──────────────────────────
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // acknowledge immediately so Telegram doesn't retry

  try {
    const message = req.body?.message;
    if (!message?.text) return;

    const chatId = message.chat.id;
    const text   = message.text;
    console.log(`📩 Telegram webhook — chat ${chatId}: "${text}"`);

    await handleCommand(chatId, text);
  } catch (err) {
    console.error('❌ Telegram webhook error:', err.message);
  }
});

module.exports = { router, handleCommand };
