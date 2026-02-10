const router = require('express').Router();
const mongoose = require('mongoose');
const SiteData = require('../models/SiteData');
const { authenticateToken } = require('../middleware/auth');

router.get('/site-data', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({});
    }
    const data = await SiteData.findOne().lean();
    return res.json(data || {});
  } catch (error) {
    console.error('Erro ao carregar dados:', error.message);
    return res.json({});
  }
});

router.get('/site-config', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const data = await SiteData.findOne().sort({ updatedAt: -1 }).lean();
      const meta = data?.integracoes?.metaPixel;
      return res.json({
        maintenance: data?.maintenance || { enabled: false },
        metaPixelId: (meta?.enabled && meta?.pixelId) ? meta.pixelId : null
      });
    }
    return res.json({ maintenance: { enabled: false }, metaPixelId: null });
  } catch (error) {
    console.error('Erro ao carregar config:', error.message);
    return res.json({ maintenance: { enabled: false }, metaPixelId: null });
  }
});

router.put('/site-data', authenticateToken, async (req, res) => {
  try {
    const updatedData = await SiteData.findOneAndUpdate({}, req.body, { upsert: true, new: true, runValidators: true });
    res.json({ ok: true, message: 'Salvo com sucesso', data: updatedData || req.body });
  } catch (error) {
    console.error('Erro ao salvar dados:', error.message);
    res.status(500).json({ ok: false, error: 'Erro ao salvar' });
  }
});

router.post('/admin/site-config', authenticateToken, async (req, res) => {
  try {
    await SiteData.findOneAndUpdate({}, req.body, { upsert: true, runValidators: true });
    res.json({ ok: true, success: true });
  } catch (error) {
    console.error('Erro ao salvar config:', error);
    res.status(500).json({ ok: false, error: 'Erro ao salvar configurações' });
  }
});

module.exports = router;
