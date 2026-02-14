# ✅ Checklist de Verificação Multi-Tenancy

## Antes de Rodar a Migração

- [ ] `.env` atualizado com `BASE_DOMAIN`, `OWNER_SLUG`, `OWNER_EMAIL`
- [ ] Backup do banco de dados MongoDB criado
- [ ] Backup do diretório `/uploads` criado
- [ ] Servidor parado (`npm stop` ou Ctrl+C)

## Executar Migração

```bash
# 1. Rodar script de migração
node src/scripts/migrate-to-multitenancy.js

# 2. Verificar output do script (deve mostrar sucesso)
# 3. Verificar que arquivos foram movidos em /uploads/{orgId}/
```

## Após Migração

### Testes Básicos

- [ ] Servidor inicia sem erros: `npm run dev`
- [ ] Health check funciona: `curl http://localhost:3000/api/health`
- [ ] Login legado (só senha) funciona em `/admin`
- [ ] Login novo (email + senha) funciona em `/admin`
- [ ] Admin carrega dados normalmente após login
- [ ] Site público carrega em `localhost:3000`
- [ ] Site público carrega com `?_tenant=fs`

### Testes de Rotas Admin

- [ ] `GET /api/site-data` retorna dados filtrados por org
- [ ] `PUT /api/site-data` salva dados na org correta
- [ ] `GET /api/sessions` lista apenas sessões da org
- [ ] `POST /api/sessions` cria sessão com organizationId
- [ ] `POST /api/admin/upload` salva arquivo em `/uploads/{orgId}/`
- [ ] `GET /api/notifications` lista apenas notificações da org
- [ ] `GET /api/newsletter` lista apenas subscribers da org

### Testes de Rotas Públicas (Cliente)

- [ ] `GET /api/site-data` funciona com tenant middleware
- [ ] `GET /api/hero` funciona com tenant middleware
- [ ] `GET /api/site-config` funciona com tenant middleware
- [ ] `POST /api/newsletter/subscribe` adiciona email com organizationId
- [ ] `POST /api/client/verify-code` valida código da org correta

### Testes de Registro

- [ ] `POST /api/auth/register` cria org + user inativos
- [ ] Login falha para user não aprovado
- [ ] `GET /api/admin/organizations` (superadmin) lista todas orgs
- [ ] `PUT /api/admin/organizations/:id/approve` ativa org
- [ ] Login funciona após aprovação

### Testes de Upload

- [ ] Upload de imagem hero salva em `/uploads/{orgId}/`
- [ ] Upload de foto de sessão salva em `/uploads/{orgId}/sessions/`
- [ ] Upload de vídeo salva em `/uploads/{orgId}/videos/`
- [ ] URLs retornadas incluem `/uploads/{orgId}/...`
- [ ] Imagens carregam corretamente no navegador

### Testes de Isolamento

- [ ] Criar segunda org via registro
- [ ] Aprovar segunda org como superadmin
- [ ] Login com usuário da segunda org
- [ ] Verificar que só vê dados da própria org
- [ ] Verificar que uploads vão para diretório correto
- [ ] Verificar que newsletter permite mesmo email em orgs diferentes

## Testes em Produção (VPS)

### DNS
- [ ] Registro A para domínio principal apontando para VPS
- [ ] Registro A wildcard `*` apontando para VPS
- [ ] DNS propagado (testar com `nslookup`)

### Nginx
- [ ] `server_name` aceita wildcard
- [ ] SSL wildcard configurado
- [ ] Site principal carrega: `https://fsfotografias.com.br`
- [ ] Subdomínio de teste carrega (criar org de teste)

### Funcionalidades
- [ ] Login funciona em produção
- [ ] Site público carrega via subdomínio
- [ ] Upload funciona em produção
- [ ] Cliente consegue acessar galeria via código
- [ ] Notificações funcionam

## Monitoramento Pós-Deploy

- [ ] Verificar logs do servidor por erros
- [ ] Verificar logs do MongoDB por queries lentas
- [ ] Monitorar uso de disco (uploads crescendo)
- [ ] Verificar performance do cache de tenant
- [ ] Testar com múltiplas orgs simultâneas

## Rollback (Se Necessário)

Se algo der errado:

```bash
# 1. Restaurar backup do MongoDB
mongorestore --uri="$MONGODB_URI" backup/

# 2. Restaurar backup de uploads
rm -rf uploads/
cp -r uploads-backup/ uploads/

# 3. Voltar para commit anterior do código
git revert HEAD
```

## Problemas Comuns

### Login não funciona
- Verificar se JWT_SECRET está definido
- Verificar se usuário foi criado na migração
- Verificar se organizationId está no JWT

### Site não carrega dados
- Verificar se middleware de tenant está ativo
- Verificar se organizationId existe nos documentos
- Verificar console do navegador por erros

### Upload falha
- Verificar permissões do diretório uploads/
- Verificar se organizationId está em req.user ou req.organizationId
- Verificar espaço em disco

### Notificações não aparecem
- Verificar se organizationId foi passado ao criar notificação
- Verificar filtro de organizationId na query

## Suporte

Em caso de problemas, consultar:
- `MULTITENANCY-README.md` - documentação completa
- Logs do servidor: `pm2 logs` ou console
- Logs do MongoDB: verificar queries lentas
- Issues no repositório

---

**Data da Implementação**: 14/02/2026
**Status**: ✅ Implementação Completa
