const express = require('express');
const router = express.Router();
const SiteData = require('../models/SiteData');
const { authenticateToken } = require('../middleware/auth');

router.get('/site-data', async (req, res) => {
  try {
    const data = await SiteData.findOne({}).lean();
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/site-data', authenticateToken, async (req, res) => {
  try {
    const setFields = {};
    for (const key of Object.keys(req.body)) {
      if (key !== '_id' && key !== '__v') setFields[key] = req.body[key];
    }
    const data = await SiteData.findOneAndUpdate(
      {},
      { $set: setFields },
      { new: true, upsert: true }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hero', async (req, res) => {
  try {
    const data = await SiteData.findOne({}).lean();
    res.json(data?.hero || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/faq', async (req, res) => {
  try {
    const data = await SiteData.findOne({}).lean();
    res.json({ faqs: data?.faq?.faqs || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/faq', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    const newFAQ = { id: `faq-${Date.now()}`, question, answer };
    await SiteData.findOneAndUpdate({}, { $push: { 'faq.faqs': newFAQ } }, { upsert: true });
    res.json({ success: true, faq: newFAQ });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await SiteData.findOne({});
    if (!data || !data.faq || !data.faq.faqs[index]) return res.status(404).json({ error: 'FAQ não encontrada' });
    if (req.body.question) data.faq.faqs[index].question = req.body.question;
    if (req.body.answer) data.faq.faqs[index].answer = req.body.answer;
    await SiteData.findOneAndUpdate({}, { 'faq.faqs': data.faq.faqs });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await SiteData.findOne({});
    if (!data || !data.faq || !data.faq.faqs) return res.status(404).json({ error: 'Dados não encontrados' });
    data.faq.faqs.splice(index, 1);
    await SiteData.findOneAndUpdate({}, { 'faq.faqs': data.faq.faqs });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/site-config', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const data = await SiteData.findOne({}).sort({ updatedAt: -1 }).lean();
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

router.get('/marketing/overview', authenticateToken, async (req, res) => {
  res.json({ success: true, visits: 1250, leads: 77, whatsapp: 45, cpa: 15.50 });
});

module.exports = router;
