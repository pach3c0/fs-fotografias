const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Dashboard de Marketing (Dados simulados por enquanto)
router.get('/marketing/overview', authenticateToken, async (req, res) => {
  // Futuro: Buscar dados reais do MongoDB (MarketingEvent) e APIs externas
  res.json({
    success: true,
    visits: 1250,
    leads: 77,
    whatsapp: 45,
    cpa: 15.50
  });
});

module.exports = router;