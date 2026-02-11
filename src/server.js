const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch (e) { /* bcrypt opcional por enquanto */ }

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/sessions', express.static(path.join(__dirname, '../uploads/sessions')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/cliente', express.static(path.join(__dirname, '../cliente')));

// SPA route for client gallery
app.get('/galeria/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../cliente/index.html'));
});

// Preview route (bypasses maintenance curtain)
app.get('/preview', (req, res) => {
  res.redirect('/?preview');
});

// Favicon handler (silence 404)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fsfotografias';
let isConnected = false;

const connectWithRetry = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 2
    });
    isConnected = true;
    console.log('MongoDB conectado com sucesso');
  } catch (err) {
    console.error('Erro na conexão MongoDB:', err.message);
    isConnected = false;
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

mongoose.connection.on('error', (err) => {
  console.error('Erro de conexão MongoDB:', err.message);
});

// Health check
// Models
const SiteData = require('./models/SiteData');
const Session = require('./models/Session');
const Notification = require('./models/Notification');
const Newsletter = require('./models/Newsletter');

const { createUploader } = require('./utils/multerConfig');

app.get('/api/health', async (req, res) => {
  const readyState = mongoose.connection.readyState;
  const states = ['desconectado', 'conectado', 'conectando', 'desconectando'];

  try {
    const mongoTest = readyState === 1 ? await SiteData.findOne().lean() : null;
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      mongodb: {
        state: readyState,
        stateText: states[readyState] || 'desconhecido',
        hasData: !!mongoTest
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      mongodb: {
        state: readyState,
        stateText: states[readyState] || 'desconhecido'
      }
    });
  }
});

// ============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// ============================================================================
// ROTAS DE AUTENTICAÇÃO
// ============================================================================
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    let isValid = false;
    if (passwordHash && bcrypt) {
      isValid = await bcrypt.compare(password, passwordHash);
    } else {
      isValid = password === adminPass;
    }

    if (isValid) {
      const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: '7d' });
      return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, error: 'Senha incorreta' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ valid: false });
  const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
  jwt.verify(token, secret, (err) => {
    if (err) return res.json({ valid: false });
    res.json({ valid: true });
  });
});

// ============================================================================
// ROTAS DE SITE DATA (Hero, Sobre, etc)
// ============================================================================
app.get('/api/site-data', async (req, res) => {
  try {
    const data = await SiteData.findOne().lean();
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/site-data', authenticateToken, async (req, res) => {
  try {
    // Proteção para não apagar dados acidentalmente
    const setFields = {};
    for (const key of Object.keys(req.body)) {
      if (key !== '_id' && key !== '__v') setFields[key] = req.body[key];
    }
    const data = await SiteData.findOneAndUpdate({}, { $set: setFields }, { new: true, upsert: true });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hero', async (req, res) => {
  try {
    const data = await SiteData.findOne().lean();
    res.json(data?.hero || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DE FAQ
// ============================================================================
app.get('/api/faq', async (req, res) => {
  try {
    const data = await SiteData.findOne().lean();
    res.json({ faqs: data?.faq?.faqs || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/faq', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    const newFAQ = { id: `faq-${Date.now()}`, question, answer };
    await SiteData.findOneAndUpdate({}, { $push: { 'faq.faqs': newFAQ } }, { upsert: true });
    res.json({ success: true, faq: newFAQ });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await SiteData.findOne();
    if (!data || !data.faq || !data.faq.faqs[index]) return res.status(404).json({ error: 'FAQ não encontrada' });
    
    if (req.body.question) data.faq.faqs[index].question = req.body.question;
    if (req.body.answer) data.faq.faqs[index].answer = req.body.answer;
    
    await SiteData.findOneAndUpdate({}, { 'faq.faqs': data.faq.faqs });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/faq/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const data = await SiteData.findOne();
    if (!data || !data.faq || !data.faq.faqs) return res.status(404).json({ error: 'Dados não encontrados' });
    
    data.faq.faqs.splice(index, 1);
    await SiteData.findOneAndUpdate({}, { 'faq.faqs': data.faq.faqs });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DE UPLOAD
// ============================================================================
const upload = createUploader('');
const videoUpload = createUploader('videos', { maxSize: 300 * 1024 * 1024 });

app.post('/api/admin/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ success: true, url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

app.post('/api/admin/upload-video', authenticateToken, videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ success: true, url: `/uploads/videos/${req.file.filename}`, filename: req.file.filename });
});

// ============================================================================
// ROTAS DE NEWSLETTER
// ============================================================================
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    await Newsletter.create({ email });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/newsletter', authenticateToken, async (req, res) => {
  try {
    const list = await Newsletter.find().sort({ createdAt: -1 });
    res.json({ subscribers: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/newsletter/:email', authenticateToken, async (req, res) => {
  try {
    await Newsletter.findOneAndDelete({ email: req.params.email });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DE NOTIFICAÇÕES
// ============================================================================
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ read: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROTAS DE SESSÕES (CLIENTE & ADMIN)
// ============================================================================
const uploadSession = createUploader('sessions');

// CLIENTE: Validar código
app.post('/api/client/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const session = await Session.findOne({ accessCode, isActive: true });
    if (!session) return res.status(401).json({ error: 'Código inválido' });

    // Notificar admin
    try { await Notification.create({ type: 'session_accessed', sessionId: session._id, sessionName: session.name, message: `${session.name} acessou a galeria` }); } catch(e){}

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

// CLIENTE: Listar fotos
app.get('/api/client/photos/:sessionId', async (req, res) => {
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

// CLIENTE: Selecionar foto
app.put('/api/client/select/:sessionId', async (req, res) => {
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
      try { await Notification.create({ type: 'selection_started', sessionId: session._id, sessionName: session.name, message: `${session.name} iniciou a seleção` }); } catch(e){}
    }

    await session.save();
    res.json({ success: true, selectedCount: session.selectedPhotos.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CLIENTE: Finalizar seleção
app.post('/api/client/submit-selection/:sessionId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    session.selectionStatus = 'submitted';
    session.selectionSubmittedAt = new Date();
    await session.save();

    try { await Notification.create({ type: 'selection_submitted', sessionId: session._id, sessionName: session.name, message: `${session.name} finalizou a seleção (${session.selectedPhotos.length} fotos)` }); } catch(e){}

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN: CRUD Sessões
app.get('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const session = await Session.create({ ...req.body, accessCode, isActive: true });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (session) {
      // Tentar limpar arquivos (opcional, pode falhar sem erro)
      session.photos.forEach(p => {
        if (p.url.startsWith('/uploads/')) {
          try { fs.unlinkSync(path.join(__dirname, '..', p.url)); } catch(e){}
        }
      });
      await Session.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sessions/:id/photos', authenticateToken, uploadSession.array('photos'), async (req, res) => {
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

app.delete('/api/sessions/:sessionId/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const idx = session.photos.findIndex(p => p.id === req.params.photoId);
    if (idx > -1) {
      const photo = session.photos[idx];
      if (photo.url.startsWith('/uploads/')) {
        try { fs.unlinkSync(path.join(__dirname, '..', photo.url)); } catch(e){}
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

app.put('/api/sessions/:id/reopen', authenticateToken, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, { selectionStatus: 'in_progress' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sessions/:id/deliver', authenticateToken, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.params.id, { selectionStatus: 'delivered', watermark: false, deliveredAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota de Marketing
app.use('/api', require('./routes/marketing'));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
