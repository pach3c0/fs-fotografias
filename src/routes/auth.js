const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');

// Login com email + senha (novo) ou senha legada (compatibilidade)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';

    // Novo fluxo: login por email
    if (email) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
      }

      // Verificar senha
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Senha incorreta' });
      }

      // Verificar se usuário está aprovado
      if (!user.approved) {
        return res.status(403).json({ success: false, error: 'Conta aguardando aprovação' });
      }

      // Verificar se organização está ativa
      const org = await Organization.findById(user.organizationId);
      if (!org || !org.isActive) {
        return res.status(403).json({ success: false, error: 'Organização inativa' });
      }

      // Gerar JWT com userId, organizationId e role
      const token = jwt.sign(
        { 
          userId: user._id,
          organizationId: user.organizationId,
          role: user.role 
        },
        secret,
        { expiresIn: '7d' }
      );

      return res.json({ 
        success: true, 
        token,
        organizationId: user.organizationId.toString(),
        role: user.role
      });
    }

    // Fluxo legado: login só com senha (manter temporariamente)
    if (password && !email) {
      const passwordHash = process.env.ADMIN_PASSWORD_HASH;
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

      let isValid = false;
      if (passwordHash) {
        isValid = await bcrypt.compare(password, passwordHash);
      } else {
        isValid = password === adminPass;
      }

      if (isValid) {
        // Buscar superadmin para retornar organizationId
        const superadmin = await User.findOne({ role: 'superadmin' });
        if (superadmin) {
          const token = jwt.sign(
            { 
              userId: superadmin._id,
              organizationId: superadmin.organizationId,
              role: 'superadmin' 
            },
            secret,
            { expiresIn: '7d' }
          );
          return res.json({ 
            success: true, 
            token,
            organizationId: superadmin.organizationId.toString(),
            role: 'superadmin'
          });
        }
        
        // Fallback: buscar org pelo slug do owner
        const ownerSlug = process.env.OWNER_SLUG || 'fs';
        const ownerOrg = await Organization.findOne({ slug: ownerSlug });
        if (ownerOrg) {
          const token = jwt.sign(
            { userId: null, organizationId: ownerOrg._id, role: 'superadmin' },
            secret,
            { expiresIn: '7d' }
          );
          return res.json({ success: true, token, organizationId: ownerOrg._id.toString(), role: 'superadmin' });
        }
        // Ultimo fallback: sem org (servidor precisa da migracao)
        return res.status(500).json({ success: false, error: 'Execute a migração primeiro: node src/scripts/migrate-to-multitenancy.js' });
      }
      
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    res.status(400).json({ success: false, error: 'Email ou senha não fornecidos' });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Registro self-service (cria org + user pendentes de aprovação)
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, orgName, slug } = req.body;

    // Validações
    if (!email || !password || !name || !orgName || !slug) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Validar formato do slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hifens' });
    }

    // Verificar se email já existe
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Verificar se slug já existe
    const existingOrg = await Organization.findOne({ slug: slug.toLowerCase().trim() });
    if (existingOrg) {
      return res.status(409).json({ error: 'Slug já está em uso' });
    }

    // Criar organização (inativa)
    const org = await Organization.create({
      name: orgName,
      slug: slug.toLowerCase().trim(),
      isActive: false,
      plan: 'free'
    });

    // Criar usuário (não aprovado)
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: 'admin',
      organizationId: org._id,
      approved: false
    });

    // Atualizar ownerId da org
    org.ownerId = user._id;
    await org.save();

    res.status(201).json({ 
      success: true, 
      message: 'Cadastro realizado! Aguarde a aprovação do administrador.',
      organizationSlug: org.slug
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno ao criar cadastro' });
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

// ============================================================================
// ROTAS DE ADMINISTRAÇÃO DE ORGANIZAÇÕES (superadmin only)
// ============================================================================

// Listar todas as organizações
router.get('/admin/organizations', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const organizations = await Organization.find()
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ organizations });
  } catch (error) {
    console.error('Erro ao listar organizações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Aprovar organização (ativa org e aprova users)
router.put('/admin/organizations/:id/approve', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Ativar organização
    org.isActive = true;
    await org.save();

    // Aprovar todos os usuários da organização
    await User.updateMany(
      { organizationId: org._id },
      { approved: true }
    );

    res.json({ 
      success: true, 
      message: `Organização "${org.name}" aprovada com sucesso!` 
    });
  } catch (error) {
    console.error('Erro ao aprovar organização:', error);
    res.status(500).json({ error: error.message });
  }
});

// Desativar organização
router.put('/admin/organizations/:id/deactivate', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    org.isActive = false;
    await org.save();

    res.json({ 
      success: true, 
      message: `Organização "${org.name}" desativada` 
    });
  } catch (error) {
    console.error('Erro ao desativar organização:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
