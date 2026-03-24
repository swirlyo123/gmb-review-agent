const express = require('express');
const router = express.Router();

// GET /api/auth/google — initiate Google OAuth flow
// Phase 2: Full OAuth with googleapis library
router.get('/google', (req, res) => {
  console.log('🔐 GET /api/auth/google — OAuth placeholder');
  res.json({
    message: 'Google OAuth coming in next phase',
    instructions:
      'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in your .env to enable Google OAuth.',
  });
});

// GET /api/auth/google/callback — OAuth callback handler (Phase 2)
router.get('/google/callback', (req, res) => {
  console.log('🔐 GET /api/auth/google/callback — OAuth callback placeholder');
  res.json({
    message: 'OAuth callback handler coming in next phase',
    code: req.query.code || null,
  });
});

// GET /api/auth/status — check if user is authenticated
router.get('/status', (req, res) => {
  res.json({
    authenticated: false,
    message: 'Authentication not yet implemented — coming in Phase 2',
  });
});

module.exports = router;
