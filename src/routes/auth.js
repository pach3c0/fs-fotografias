const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return secret || 'clique-zoom-secret-key';
}

const handleLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const jwtSecret = getJwtSecret();

    // Suporta hash bcrypt (ADMIN_PASSWORD_HASH) ou senha plain (ADMIN_PASSWORD)
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    let isValid = false;
    if (passwordHash) {
      isValid = await bcrypt.compare(password, passwordHash);
    } else {
      isValid = password === adminPass;
    }

    if (isValid) {
      const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '7d' });
      return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, error: 'Senha incorreta' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
};

router.post('/login', handleLogin);

router.post('/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ valid: false });

  try {
    jwt.verify(token, getJwtSecret());
    return res.json({ valid: true });
  } catch (error) {
    return res.status(401).json({ valid: false });
  }
});

module.exports = router;
