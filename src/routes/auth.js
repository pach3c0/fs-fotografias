const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login com senha unica
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    let isValid = false;
    if (passwordHash) {
      isValid = await bcrypt.compare(password, passwordHash);
    } else {
      isValid = password === adminPass;
    }

    if (isValid) {
      const token = jwt.sign({ admin: true }, secret, { expiresIn: '7d' });
      return res.json({ success: true, token });
    }

    res.status(401).json({ success: false, error: 'Senha incorreta' });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Verificar token
router.post('/auth/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ valid: false });
  const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
  jwt.verify(token, secret, (err) => {
    if (err) return res.json({ valid: false });
    res.json({ valid: true });
  });
});

module.exports = router;
