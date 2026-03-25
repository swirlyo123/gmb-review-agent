const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/settings — return delivery config for tenant
router.get('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  console.log('⚙️  GET /api/settings');

  if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header required' });

  try {
    const config = await prisma.deliveryConfig.findUnique({ where: { tenantId } });
    res.json({ config: config || {} });
  } catch (err) {
    console.error('❌ GET /api/settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings — save delivery config for tenant
router.post('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  const { whatsappNumber, telegramChatId, email, digestTime } = req.body;
  console.log('⚙️  POST /api/settings — saving config for tenant:', tenantId);

  if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header required' });

  try {
    const config = await prisma.deliveryConfig.upsert({
      where: { tenantId },
      update: {
        whatsappNumber: whatsappNumber || null,
        telegramChatId: telegramChatId || null,
        email: email || null,
        digestTime: digestTime || '20:00',
      },
      create: {
        tenantId,
        whatsappNumber: whatsappNumber || null,
        telegramChatId: telegramChatId || null,
        email: email || null,
        digestTime: digestTime || '20:00',
      },
    });

    console.log('✅ Settings saved:', JSON.stringify(config));
    res.json({ success: true, config });
  } catch (err) {
    console.error('❌ POST /api/settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
