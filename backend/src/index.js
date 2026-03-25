require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');
const settingsRoutes = require('./routes/settings');
const { startPolling } = require('./jobs/pollReviews');
const { prisma } = require('./lib/prisma');
const { runAutoTest } = require('./scripts/testFlow');
const { router: telegramRouter, handleCommand } = require('./routes/telegram');
const { startTelegramPoller } = require('./services/telegramPoller');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/telegram', telegramRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GMB Review Agent backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 OAuth start: http://localhost:${PORT}/api/auth/google`);

  // Start the review polling job
  startPolling();
  console.log('⏰ Review polling job started (every 15 minutes)');

  // Telegram: use webhook in production, long-poll getUpdates in local dev
  if (process.env.TELEGRAM_WEBHOOK_URL) {
    console.log(`🔗 Telegram webhook mode — ${process.env.TELEGRAM_WEBHOOK_URL}/api/telegram/webhook`);
  } else {
    startTelegramPoller(handleCommand);
  }

  // Auto test — runs once per day, 5s after boot
  setTimeout(async () => {
    try {
      const tenant = await prisma.tenant.findFirst();
      if (tenant) await runAutoTest(tenant.id);
    } catch (err) {
      console.error('❌ Auto test error:', err.message);
    }
  }, 5000);
});
