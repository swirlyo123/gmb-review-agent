const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header required' });
  try {
    const config = await prisma.deliveryConfig.findUnique({ where: { tenantId } });
    res.json({ config: config || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) return res.status(400).json({ error: 'x-tenant-id header required' });

  const {
    whatsappEnabled, whatsappNumber,
    telegramEnabled, telegramChatId,
    emailEnabled, email,
    digestTime, replyMode, businessName,
  } = req.body;

  console.log('⚙️  POST /api/settings — saving for tenant:', tenantId);

  try {
    const data = {
      whatsappEnabled:  !!whatsappEnabled,
      whatsappNumber:   whatsappNumber  || null,
      telegramEnabled:  !!telegramEnabled,
      telegramChatId:   telegramChatId  || null,
      emailEnabled:     !!emailEnabled,
      email:            email           || null,
      digestTime:       digestTime      || '20:00',
      replyMode:        replyMode       || 'hold_all',
      businessName:     businessName    || null,
    };

    const config = await prisma.deliveryConfig.upsert({
      where:  { tenantId },
      update: data,
      create: { tenantId, ...data },
    });

    console.log('✅ Settings saved');
    res.json({ success: true, config });
  } catch (err) {
    console.error('❌ settings save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
