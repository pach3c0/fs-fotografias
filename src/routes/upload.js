const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');

const upload = createUploader('');
const videoUpload = createUploader('videos', { maxSize: 300 * 1024 * 1024 });

router.post('/admin/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'Nenhum arquivo enviado' });

  res.json({
    ok: true,
    success: true,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

router.post('/admin/upload-video', authenticateToken, videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'Nenhum arquivo enviado' });

  res.json({
    ok: true,
    success: true,
    filename: req.file.filename,
    url: `/uploads/videos/${req.file.filename}`
  });
});

module.exports = router;
