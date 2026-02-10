const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');

const upload = createUploader('');

router.post('/admin/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'Nenhum arquivo enviado' });

  res.json({
    ok: true,
    success: true,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

module.exports = router;
