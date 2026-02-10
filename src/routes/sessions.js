const router = require('express').Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Session = require('../models/Session');
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');
const { notify } = require('../utils/notifications');
const { sendLead, sendCompleteRegistration } = require('../utils/metaEvents');

const uploadSession = createUploader('sessions');

// ==================== CLIENTE ====================

// CLIENTE: Validar codigo de acesso
router.post('/client/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    if (!accessCode) {
      return res.status(400).json({ error: 'Código de acesso obrigatório' });
    }

    const session = await Session.findOne({ accessCode, isActive: true });

    if (!session) {
      return res.status(401).json({ error: 'Código inválido' });
    }

    // Notificar admin que cliente acessou
    await notify('session_accessed', session._id, session.name, `${session.name} acessou a galeria`);
    sendLead(req, session.name);

    res.json({
      success: true,
      sessionId: session._id,
      accessCode: session.accessCode,
      clientName: session.name,
      galleryDate: new Date(session.date).toLocaleDateString('pt-BR'),
      sessionType: session.type,
      totalPhotos: session.photos.length,
      watermark: session.watermark,
      canShare: session.canShare,
      mode: session.mode || 'gallery',
      packageLimit: session.packageLimit || 30,
      extraPhotoPrice: session.extraPhotoPrice || 25,
      selectionStatus: session.selectionStatus || 'pending',
      selectedCount: (session.selectedPhotos || []).length
    });
  } catch (error) {
    console.error('Erro ao validar código:', error);
    res.status(500).json({ error: 'Erro ao validar código' });
  }
});

// CLIENTE: Listar fotos da sessao
router.get('/client/photos/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code } = req.query;

    const session = await Session.findById(sessionId);

    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (session.accessCode !== code) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    res.json({
      success: true,
      mode: session.mode || 'gallery',
      packageLimit: session.packageLimit || 30,
      extraPhotoPrice: session.extraPhotoPrice || 25,
      selectionStatus: session.selectionStatus || 'pending',
      selectedPhotos: session.selectedPhotos || [],
      watermark: session.watermark,
      photos: session.photos.map(p => ({
        id: p.id,
        url: p.url,
        filename: p.filename
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar fotos:', error);
    res.status(500).json({ error: 'Erro ao buscar fotos' });
  }
});

// CLIENTE: Selecionar/deselecionar foto
router.put('/client/select/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { photoId, selected, accessCode } = req.body;

    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (session.accessCode !== accessCode) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    if (session.mode !== 'selection') {
      return res.status(400).json({ error: 'Sessão não está em modo seleção' });
    }

    if (session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered') {
      return res.status(400).json({ error: 'Seleção já foi finalizada' });
    }

    // Verificar que a foto existe na sessao
    const photoExists = session.photos.some(p => p.id === photoId);
    if (!photoExists) {
      return res.status(404).json({ error: 'Foto não encontrada' });
    }

    if (!session.selectedPhotos) session.selectedPhotos = [];

    if (selected) {
      if (!session.selectedPhotos.includes(photoId)) {
        session.selectedPhotos.push(photoId);
      }
    } else {
      session.selectedPhotos = session.selectedPhotos.filter(id => id !== photoId);
    }

    // Atualizar status
    if (session.selectionStatus === 'pending' && session.selectedPhotos.length > 0) {
      session.selectionStatus = 'in_progress';
      // Notificar admin que cliente iniciou selecao
      await notify('selection_started', session._id, session.name, `${session.name} iniciou a seleção de fotos`);
    }
    if (session.selectedPhotos.length === 0 && session.selectionStatus === 'in_progress') {
      session.selectionStatus = 'pending';
    }

    await session.save();

    res.json({
      success: true,
      selectedPhotos: session.selectedPhotos,
      selectedCount: session.selectedPhotos.length
    });
  } catch (error) {
    console.error('Erro ao selecionar foto:', error);
    res.status(500).json({ error: 'Erro ao selecionar foto' });
  }
});

// CLIENTE: Finalizar selecao
router.post('/client/submit-selection/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { accessCode } = req.body;

    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (session.accessCode !== accessCode) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    if (session.mode !== 'selection') {
      return res.status(400).json({ error: 'Sessão não está em modo seleção' });
    }

    if (session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered') {
      return res.status(400).json({ error: 'Seleção já foi finalizada' });
    }

    if (!session.selectedPhotos || session.selectedPhotos.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto selecionada' });
    }

    session.selectionStatus = 'submitted';
    session.selectionSubmittedAt = new Date();
    await session.save();

    // Notificar admin que selecao foi enviada
    const extras = Math.max(0, session.selectedPhotos.length - (session.packageLimit || 30));
    let notifMsg = `${session.name} enviou a seleção (${session.selectedPhotos.length} fotos)`;
    if (extras > 0) notifMsg += ` - ${extras} extras`;
    await notify('selection_submitted', session._id, session.name, notifMsg);
    sendCompleteRegistration(req, session.name, extras * (session.extraPhotoPrice || 25));

    res.json({
      success: true,
      selectedCount: session.selectedPhotos.length,
      submittedAt: session.selectionSubmittedAt
    });
  } catch (error) {
    console.error('Erro ao finalizar seleção:', error);
    res.status(500).json({ error: 'Erro ao finalizar seleção' });
  }
});

// CLIENTE: Pedir reabertura da selecao
router.post('/client/request-reopen/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { accessCode } = req.body;

    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (session.accessCode !== accessCode) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    if (session.selectionStatus !== 'submitted') {
      return res.status(400).json({ error: 'Seleção não está no status enviada' });
    }

    // Criar notificacao para o admin
    await notify('reopen_requested', session._id, session.name, `${session.name} pediu reabertura da seleção`);

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao pedir reabertura:', error);
    res.status(500).json({ error: 'Erro ao pedir reabertura' });
  }
});

// ==================== ADMIN ====================

// ADMIN: Criar nova sessao
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { name, type, date, mode, packageLimit, extraPhotoPrice } = req.body;

    if (!name || !type || !date) {
      return res.status(400).json({ error: 'Nome, tipo e data são obrigatórios' });
    }

    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const newSession = new Session({
      name,
      type,
      date: new Date(date),
      accessCode,
      photos: [],
      mode: mode || 'selection',
      packageLimit: packageLimit || 30,
      extraPhotoPrice: extraPhotoPrice || 25,
      selectionStatus: 'pending',
      selectedPhotos: [],
      watermark: true,
      canShare: false,
      isActive: true
    });

    await newSession.save();
    res.json({ success: true, session: newSession });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({ error: 'Erro ao criar sessão: ' + error.message });
  }
});

// ADMIN: Listar todas as sessoes
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    res.status(500).json({ error: 'Erro ao buscar sessões' });
  }
});

// ADMIN: Deletar sessao
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (session) {
      // Deletar arquivos de fotos do disco
      for (const photo of session.photos) {
        if (photo.url && photo.url.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '../..', photo.url);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      }
      await Session.findByIdAndDelete(sessionId);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar sessão:', error);
    res.status(500).json({ error: 'Erro ao deletar sessão' });
  }
});

// ADMIN: Reabrir selecao (permitir cliente alterar)
router.put('/sessions/:sessionId/reopen', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (session.selectionStatus !== 'submitted') {
      return res.status(400).json({ error: 'Seleção não está no status enviada' });
    }

    session.selectionStatus = 'in_progress';
    session.selectionSubmittedAt = null;
    await session.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao reabrir seleção:', error);
    res.status(500).json({ error: 'Erro ao reabrir seleção' });
  }
});

// ADMIN: Marcar como entregue
router.put('/sessions/:sessionId/deliver', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    session.selectionStatus = 'delivered';
    session.deliveredAt = new Date();
    session.watermark = false;
    await session.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar entrega:', error);
    res.status(500).json({ error: 'Erro ao marcar entrega' });
  }
});

// ADMIN: Exportar lista de fotos selecionadas (para Lightroom)
// Aceita token via query param para abrir em nova aba
router.get('/sessions/:sessionId/export', async (req, res) => {
  try {
    // Auth via query param ou header
    const token = req.query.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'clique-zoom-secret-key';
    try { jwt.verify(token, secret); } catch { return res.status(403).json({ error: 'Token inválido' }); }

    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const selectedIds = session.selectedPhotos || [];
    const filenames = session.photos
      .filter(p => selectedIds.includes(p.id))
      .map(p => p.filename);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="selecao-${session.name.replace(/\s+/g, '-')}.txt"`);
    res.send(filenames.join('\n'));
  } catch (error) {
    console.error('Erro ao exportar:', error);
    res.status(500).json({ error: 'Erro ao exportar' });
  }
});

// ADMIN: Editar configuracoes da sessao
router.put('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { mode, packageLimit, extraPhotoPrice } = req.body;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (mode) session.mode = mode;
    if (packageLimit !== undefined) session.packageLimit = packageLimit;
    if (extraPhotoPrice !== undefined) session.extraPhotoPrice = extraPhotoPrice;

    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    console.error('Erro ao editar sessão:', error);
    res.status(500).json({ error: 'Erro ao editar sessão' });
  }
});

// ADMIN: Upload de fotos para sessao
router.post('/sessions/:sessionId/photos', authenticateToken, uploadSession.array('photos', 50), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto fornecida' });
    }

    const uploadedPhotos = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const photo = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        filename: file.originalname,
        url: `/uploads/sessions/${file.filename}`,
        uploadedAt: new Date()
      };

      session.photos.push(photo);
      uploadedPhotos.push(photo);
    }

    await session.save();

    res.json({
      success: true,
      photos: uploadedPhotos,
      totalPhotos: session.photos.length
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload', details: error.message });
  }
});

// ADMIN: Remover foto da sessao
router.delete('/sessions/:sessionId/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const { sessionId, photoId } = req.params;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const photoIndex = session.photos.findIndex(p => p.id === photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Foto não encontrada' });
    }

    // Deletar arquivo do disco se for local
    const photo = session.photos[photoIndex];
    if (photo.url && photo.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../..', photo.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // Remover da lista de selecionadas tambem
    if (session.selectedPhotos) {
      session.selectedPhotos = session.selectedPhotos.filter(id => id !== photoId);
    }

    session.photos.splice(photoIndex, 1);
    await session.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover foto:', error);
    res.status(500).json({ error: 'Erro ao remover foto' });
  }
});

module.exports = router;
