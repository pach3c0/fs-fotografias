const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const uploadSession = createUploader('sessions');

// ============================================================================
// ROTAS DO CLIENTE
// ============================================================================

router.post('/client/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const session = await Session.findOne({ accessCode, isActive: true });
    if (!session) return res.status(401).json({ error: 'Código inválido' });

    try {
      await Notification.create({
        type: 'session_accessed',
        sessionId: session._id,
        sessionName: session.name,
        message: `${session.name} acessou a galeria`
      });
    } catch(e){}

    res.json({
      success: true,
      sessionId: session._id,
      clientName: session.name,
      mode: session.mode || 'gallery',
      selectionStatus: session.selectionStatus || 'pending'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/client/photos/:sessionId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json({
      success: true,
      photos: session.photos,
      selectedPhotos: session.selectedPhotos || [],
      mode: session.mode,
      selectionStatus: session.selectionStatus,
      watermark: session.watermark,
      packageLimit: session.packageLimit,
      extraPhotoPrice: session.extraPhotoPrice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/client/select/:sessionId', async (req, res) => {
  try {
    const { photoId, selected } = req.body;
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    if (!session.selectedPhotos) session.selectedPhotos = [];

    if (selected) {
      if (!session.selectedPhotos.includes(photoId)) session.selectedPhotos.push(photoId);
    } else {
      session.selectedPhotos = session.selectedPhotos.filter(id => id !== photoId);
    }

    if (session.selectionStatus === 'pending' && session.selectedPhotos.length > 0) {
      session.selectionStatus = 'in_progress';
      try {
        await Notification.create({
          type: 'selection_started',
          sessionId: session._id,
          sessionName: session.name,
          message: `${session.name} iniciou a seleção`
        });
      } catch(e){}
    }

    await session.save();
    res.json({ success: true, selectedCount: session.selectedPhotos.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/client/submit-selection/:sessionId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    session.selectionStatus = 'submitted';
    session.selectionSubmittedAt = new Date();
    await session.save();

    try {
      await Notification.create({
        type: 'selection_submitted',
        sessionId: session._id,
        sessionName: session.name,
        message: `${session.name} finalizou a seleção (${session.selectedPhotos.length} fotos)`
      });
    } catch(e){}

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/client/request-reopen/:sessionId', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const session = await Session.findById(req.params.sessionId);
    if (!session || !session.isActive) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.accessCode !== accessCode) return res.status(403).json({ error: 'Acesso não autorizado' });
    if (session.selectionStatus !== 'submitted') return res.status(400).json({ error: 'Seleção não está no status enviada' });

    try {
      await Notification.create({
        type: 'reopen_requested',
        sessionId: session._id,
        sessionName: session.name,
        message: `${session.name} pediu reabertura da seleção`
      });
    } catch(e){}

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DO ADMIN
// ============================================================================

router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find({}).sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const session = await Session.create({ ...req.body, accessCode, isActive: true });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (session) {
      session.photos.forEach(p => {
        if (p.url.startsWith('/uploads/')) {
          try { fs.unlinkSync(path.join(__dirname, '../..', p.url)); } catch(e){}
        }
      });
      await Session.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/photos', authenticateToken, uploadSession.array('photos'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const newPhotos = req.files.map(file => ({
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      filename: file.filename,
      url: `/uploads/sessions/${file.filename}`,
      uploadedAt: new Date()
    }));

    session.photos.push(...newPhotos);
    await session.save();
    res.json({ success: true, photos: newPhotos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:sessionId/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const idx = session.photos.findIndex(p => p.id === req.params.photoId);
    if (idx > -1) {
      const photo = session.photos[idx];
      if (photo.url.startsWith('/uploads/')) {
        try { fs.unlinkSync(path.join(__dirname, '../..', photo.url)); } catch(e){}
      }
      session.photos.splice(idx, 1);
      if (session.selectedPhotos) {
        session.selectedPhotos = session.selectedPhotos.filter(id => id !== req.params.photoId);
      }
      await session.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/reopen', authenticateToken, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, { selectionStatus: 'in_progress' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sessions/:id/deliver', authenticateToken, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, { selectionStatus: 'delivered', watermark: false, deliveredAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:sessionId/export', (req, res) => {
  const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
  try {
    jwt.verify(token, secret);
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }

  Session.findById(req.params.sessionId)
    .then(session => {
      if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
      const selectedIds = session.selectedPhotos || [];
      const filenames = session.photos.filter(p => selectedIds.includes(p.id)).map(p => p.filename);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="selecao-${session.name.replace(/\s+/g, '-')}.txt"`);
      res.send(filenames.join('\n'));
    })
    .catch(error => res.status(500).json({ error: error.message }));
});

module.exports = router;
