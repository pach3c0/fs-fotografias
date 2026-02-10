const router = require('express').Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

// ADMIN: Listar notificacoes
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// ADMIN: Contar nao lidas
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ read: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao contar notificações' });
  }
});

// ADMIN: Marcar todas como lidas
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

// ADMIN: Deletar notificacao
router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar notificação' });
  }
});

module.exports = router;
