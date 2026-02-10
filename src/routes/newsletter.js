const router = require('express').Router();
const Newsletter = require('../models/Newsletter');
const { authenticateToken } = require('../middleware/auth');
const { sendSubscribe } = require('../utils/metaEvents');

router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        await existing.save();
      }
      return res.json({ success: true, alreadySubscribed: true, message: 'Já inscrito' });
    }

    await Newsletter.create({ email });
    sendSubscribe(req, email);
    res.json({ success: true, message: 'Inscrito com sucesso' });
  } catch (error) {
    console.error('Erro newsletter:', error);
    res.status(500).json({ error: 'Erro ao inscrever' });
  }
});

router.get('/newsletter', authenticateToken, async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ createdAt: -1 });
    res.json({ subscribers, pagination: { total: subscribers.length } });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar inscritos' });
  }
});

router.delete('/newsletter/:email', authenticateToken, async (req, res) => {
  try {
    await Newsletter.findOneAndDelete({ email: req.params.email });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover' });
  }
});

module.exports = router;
