const router = require('express').Router();
const mongoose = require('mongoose');
const SiteData = require('../models/SiteData');
const { authenticateToken } = require('../middleware/auth');

const defaultHero = {
  title: 'CLIQUE·ZOOM',
  subtitle: 'Fotografia Minimalista e Autêntica',
  image: '',
  transform: { scale: 1, posX: 50, posY: 50 },
  titleTransform: { posX: 50, posY: 40 },
  subtitleTransform: { posX: 50, posY: 55 },
  titleFontSize: 48,
  subtitleFontSize: 18,
  topBarHeight: 0,
  bottomBarHeight: 0,
  overlayOpacity: 30
};

router.get('/hero', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(defaultHero);
    }

    const siteData = await SiteData.findOne().lean();
    res.json(siteData?.hero || defaultHero);
  } catch (error) {
    console.error('Erro ao buscar hero:', error.message);
    res.json(defaultHero);
  }
});

router.put('/hero', authenticateToken, async (req, res) => {
  try {
    await SiteData.findOneAndUpdate(
      {},
      { $set: { hero: req.body } },
      { upsert: true, runValidators: true }
    );
    res.json({ success: true, message: 'Hero atualizado com sucesso', data: req.body });
  } catch (error) {
    console.error('Erro ao atualizar hero:', error.message);
    res.status(500).json({ error: 'Erro ao salvar hero' });
  }
});

module.exports = router;
