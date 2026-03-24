require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');
const { startPolling } = require('./jobs/pollReviews');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GMB Review Agent backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);

  // Start the review polling job
  startPolling();
  console.log('⏰ Review polling job started (every 15 minutes)');
});
