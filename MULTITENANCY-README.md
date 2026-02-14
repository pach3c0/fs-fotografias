# Multi-Tenancy Fase 1 - Implementado ✅

## 📋 Resumo da Implementação

Todos os 10 passos do plano de multi-tenancy foram concluídos com sucesso:

✅ **Passo 0** - Rotas refatoradas em módulos separados  
✅ **Passo 1** - Models User e Organization criados  
✅ **Passo 2** - organizationId adicionado em todos os models  
✅ **Passo 3** - Script de migração pronto  
✅ **Passo 4** - Autenticação reformulada (email + senha)  
✅ **Passo 5** - Middleware de tenant por subdomínio  
✅ **Passo 6** - Todas as queries filtradas por organizationId  
✅ **Passo 7** - Uploads isolados por organização  
✅ **Passo 8** - Frontend admin atualizado  
✅ **Passo 9** - Middleware conectado nas rotas corretas  

## 🔧 Variáveis de Ambiente (.env)

Adicione ou atualize as seguintes variáveis no arquivo `.env`:

```bash
# Existentes (manter)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=seu-secret-aqui
PORT=3000

# Novas (adicionar)
BASE_DOMAIN=fsfotografias.com.br
OWNER_SLUG=fs
OWNER_EMAIL=seuemail@exemplo.com

# Para migração inicial (opcional, pode usar senha padrão)
ADMIN_PASSWORD=SuaSenhaSegura123
```

## 🚀 Próximos Passos

### 1. Rodar o Script de Migração

```bash
node src/scripts/migrate-to-multitenancy.js
```

Este script irá:
- Criar a organização principal (slug: fs)
- Criar o usuário superadmin
- Adicionar organizationId em todos os documentos existentes
- Mover arquivos de upload para /uploads/{orgId}/
- Atualizar URLs no banco de dados

### 2. Reiniciar o Servidor

```bash
npm run dev
```

### 3. Fazer Login com Email

Acesse `/admin` e faça login com:
- **Email**: o email definido em `OWNER_EMAIL`
- **Senha**: a senha definida em `ADMIN_PASSWORD`

> **Nota**: O login legado (só com senha) ainda funciona para compatibilidade durante a transição.

## 🌐 Configuração de DNS e Nginx (VPS)

### DNS
Adicionar registro A wildcard apontando para o IP da VPS:
```
*.fsfotografias.com.br  →  SEU_IP_VPS
```

### Nginx
Atualizar o `server_name` para aceitar wildcard:
```nginx
server_name fsfotografias.com.br *.fsfotografias.com.br;
```

### SSL (Let's Encrypt)
Certificado wildcard via DNS challenge:
```bash
certbot certonly --manual --preferred-challenges dns -d fsfotografias.com.br -d *.fsfotografias.com.br
```

## 📝 Rotas de API Atualizadas

### Públicas (usam subdomínio via middleware de tenant)
- `GET /api/site-data` - carrega dados do site
- `GET /api/hero` - carrega hero
- `GET /api/site-config` - config de manutenção
- `GET /api/faq` - lista FAQs
- `POST /api/newsletter/subscribe` - inscrever email
- `POST /api/client/*` - rotas do cliente (sessões)

### Admin (usam organizationId do JWT)
- `POST /api/login` - login com email+senha
- `POST /api/auth/register` - registro self-service
- `GET /api/admin/organizations` - listar orgs (superadmin)
- `PUT /api/admin/organizations/:id/approve` - aprovar org (superadmin)
- `PUT /api/site-data` - atualizar dados
- `GET /api/sessions` - listar sessões
- `POST /api/sessions` - criar sessão
- Todas as demais rotas admin

## 🧪 Testando Multi-Tenancy

### Em Desenvolvimento (localhost)
Use query parameter `?_tenant=slug`:
```
http://localhost:3000/?_tenant=fs
http://localhost:3000/?_tenant=joao
```

### Em Produção
Use subdomínios:
```
https://fsfotografias.com.br (slug: fs)
https://joao.fsfotografias.com.br (slug: joao)
```

## 📦 Estrutura de Uploads

```
uploads/
  ├── {organizationId}/
  │   ├── sessions/
  │   │   └── abc123.jpg
  │   ├── videos/
  │   │   └── xyz456.mp4
  │   └── hero-image.jpg
```

URLs geradas:
```
/uploads/{orgId}/sessions/abc123.jpg
/uploads/{orgId}/videos/xyz456.mp4
/uploads/{orgId}/hero-image.jpg
```

## 🔐 Registro de Novas Organizações

Usuários podem se cadastrar via:

```bash
POST /api/auth/register
{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "Nome do Fotógrafo",
  "orgName": "Nome do Estúdio",
  "slug": "nome-slug"
}
```

A organização ficará **inativa** até aprovação do superadmin via:

```bash
PUT /api/admin/organizations/{id}/approve
```

## 🛡️ Segurança

- ✅ JWT com userId, organizationId e role
- ✅ Todas as queries filtradas por organizationId
- ✅ Uploads isolados por organização
- ✅ Middleware de autenticação com verificação de role
- ✅ Rotas de superadmin restritas
- ✅ Validação de organização ativa no login

## 📚 Arquivos Criados/Modificados

### Novos Arquivos
- `src/models/User.js`
- `src/models/Organization.js`
- `src/middleware/auth.js`
- `src/middleware/tenant.js`
- `src/routes/auth.js`
- `src/routes/siteData.js`
- `src/routes/upload.js`
- `src/routes/newsletter.js`
- `src/routes/notifications.js`
- `src/routes/sessions.js`
- `src/scripts/migrate-to-multitenancy.js`

### Modificados
- `src/server.js` (refatorado)
- `src/models/SiteData.js` (+organizationId)
- `src/models/Session.js` (+organizationId + index)
- `src/models/Notification.js` (+organizationId)
- `src/models/Newsletter.js` (+organizationId + index composto)
- `src/utils/multerConfig.js` (isolamento por org)
- `admin/js/state.js` (+organizationId)
- `admin/js/app.js` (login com email)
- `admin/index.html` (campo de email)

## ⚠️ Notas Importantes

1. **Login Legado**: Login só com senha continua funcionando durante a transição. Após todos migrarem para email+senha, remover o fallback.

2. **Index do Newsletter**: O index único de email foi substituído por um index composto `{organizationId, email}`. Permite o mesmo email em organizações diferentes.

3. **Cache de Tenant**: O middleware de tenant usa cache em memória (Map) com TTL de 5 minutos. Em cluster, considerar Redis.

4. **Notificações**: Todas as criações de `Notification` precisam passar `organizationId`. Verifique os try/catch inline nas rotas de sessão.

5. **Uploads Existentes**: O script de migração move os arquivos e atualiza URLs automaticamente.

## 🎯 Próxima Fase (Futuro)

- [ ] Painel de administração de organizações no frontend
- [ ] Limites por plano (free, basic, pro)
- [ ] Billing e pagamentos
- [ ] Custom domain por organização
- [ ] Analytics por organização
- [ ] White-label (customização total)
