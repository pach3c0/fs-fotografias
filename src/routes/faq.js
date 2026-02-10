const router = require('express').Router();
const mongoose = require('mongoose');
const SiteData = require('../models/SiteData');
const { authenticateToken } = require('../middleware/auth');

async function readFAQData() {
  if (mongoose.connection.readyState !== 1) return { faqs: [] };
  const siteData = await SiteData.findOne().lean();
  return { faqs: siteData?.faq?.faqs || [] };
}

async function writeFAQData(faqs) {
  await SiteData.findOneAndUpdate(
    {},
    { $set: { 'faq.faqs': faqs } },
    { upsert: true, runValidators: true }
  );
}

router.get('/faq', async (req, res) => {
  try {
    const data = await readFAQData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar FAQs' });
  }
});

router.post('/faq', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Pergunta e resposta são obrigatórias' });
    }

    const data = await readFAQData();
    const newFAQ = { id: `faq-${Date.now()}`, question, answer };
    data.faqs.push(newFAQ);

    await writeFAQData(data.faqs);
    res.json({ success: true, faq: newFAQ });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar FAQ' });
  }
});

router.put('/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await readFAQData();

    if (index < 0 || index >= data.faqs.length) {
      return res.status(404).json({ error: 'FAQ não encontrada' });
    }

    if (req.body.question !== undefined) data.faqs[index].question = req.body.question;
    if (req.body.answer !== undefined) data.faqs[index].answer = req.body.answer;

    await writeFAQData(data.faqs);
    res.json({ success: true, faq: data.faqs[index] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar FAQ' });
  }
});

router.delete('/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await readFAQData();

    if (index < 0 || index >= data.faqs.length) {
      return res.status(404).json({ error: 'FAQ não encontrada' });
    }

    data.faqs.splice(index, 1);

    await writeFAQData(data.faqs);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover FAQ' });
  }
});

router.post('/faq/:index/move', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const { direction } = req.body;
    const data = await readFAQData();

    if (index < 0 || index >= data.faqs.length) {
      return res.status(404).json({ error: 'FAQ não encontrada' });
    }

    if (direction === 'up' && index > 0) {
      [data.faqs[index - 1], data.faqs[index]] = [data.faqs[index], data.faqs[index - 1]];
    } else if (direction === 'down' && index < data.faqs.length - 1) {
      [data.faqs[index], data.faqs[index + 1]] = [data.faqs[index + 1], data.faqs[index]];
    } else {
      return res.status(400).json({ error: 'Movimento inválido' });
    }

    await writeFAQData(data.faqs);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao mover FAQ' });
  }
});

module.exports = router;
