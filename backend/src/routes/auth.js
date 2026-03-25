const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { prisma } = require('../lib/prisma');
const { getOAuthClient } = require('../services/gmb');

const SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/business.manage',
];

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// GET /api/auth/google
router.get('/google', (req, res) => {
  console.log('🔐 GET /api/auth/google — generating OAuth URL...');
  const oauth2Client = getOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.redirect(authUrl);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?error=${error || 'no_code'}`);
  }

  try {
    console.log('🔐 Exchanging code for tokens...');
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();
    console.log(`👤 Authenticated as: ${profile.email}`);

    let tenant = await prisma.tenant.findUnique({ where: { email: profile.email } });

    if (tenant) {
      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || tenant.refreshToken,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
      console.log(`✅ Updated tokens for: ${profile.email}`);
    } else {
      tenant = await prisma.tenant.create({
        data: {
          businessName: profile.name || 'My Business',
          email: profile.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
      console.log(`✅ Created new tenant: ${tenant.id} for ${profile.email}`);
    }

    res.redirect(`${FRONTEND_URL}/login?tenantId=${tenant.id}&step=select-locations`);
  } catch (err) {
    console.error('❌ OAuth callback error:', err.message);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// GET /api/auth/status
router.get('/status', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.json({ connected: false, message: 'No tenantId provided' });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { locations: { where: { isActive: true } } },
    });

    if (!tenant) return res.json({ connected: false, message: 'Tenant not found' });

    res.json({
      connected: !!tenant.accessToken,
      tokenExpired: tenant.tokenExpiry ? new Date(tenant.tokenExpiry) < new Date() : false,
      businessName: tenant.businessName,
      email: tenant.email,
      locations: tenant.locations,
      locationCount: tenant.locations.length,
    });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// GET /api/auth/locations — list all GMB locations from Google
router.get('/locations', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header required' });

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.accessToken) return res.status(401).json({ error: 'Not connected to Google' });

    const { getLocations, getValidAccessToken } = require('../services/gmb');
    const accessToken = await getValidAccessToken(tenant);
    const locations = await getLocations(accessToken);

    // Mark which ones are already being monitored
    const monitored = await prisma.location.findMany({
      where: { tenantId },
      select: { gmbLocationId: true },
    });
    const monitoredIds = new Set(monitored.map((l) => l.gmbLocationId));

    const enriched = locations.map((l) => ({
      ...l,
      alreadyAdded: monitoredIds.has(l.name),
    }));

    res.json({ locations: enriched });
  } catch (err) {
    console.error('❌ /api/auth/locations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/select-locations — save one or many locations to monitor
router.post('/select-locations', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { locations } = req.body; // array of { locationId, accountId, name, address }

  if (!tenantId || !locations?.length) {
    return res.status(400).json({ error: 'tenantId header and locations array required' });
  }

  try {
    const saved = [];
    for (const loc of locations) {
      const record = await prisma.location.upsert({
        where: { gmbLocationId: loc.locationId },
        update: { isActive: true, name: loc.name, address: loc.address || null },
        create: {
          tenantId,
          gmbLocationId: loc.locationId,
          gmbAccountId: loc.accountId || null,
          name: loc.name,
          address: loc.address || null,
          isActive: true,
        },
      });
      saved.push(record);
    }

    console.log(`✅ Saved ${saved.length} location(s) for tenant ${tenantId}`);
    res.json({ success: true, saved });
  } catch (err) {
    console.error('❌ select-locations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/locations/:locationId — remove a location from monitoring
router.delete('/locations/:locationId', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { locationId } = req.params;

  try {
    await prisma.location.updateMany({
      where: { tenantId, id: locationId },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
