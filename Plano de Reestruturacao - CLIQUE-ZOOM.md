Plano de Reestruturacao - CLIQUE-ZOOM
Contexto
O app CLIQUE-ZOOM e uma plataforma de portfolio fotografico (site publico + admin + galeria de clientes). O codebase cresceu de forma desorganizada: ~960 linhas de codigo morto, server.js monolitico de 738 linhas, admin/index.html com 2100+ linhas, Hero/FAQ salvos em JSON file (quebra na Vercel), TailwindCSS compilando no browser via CDN (causa travamento), e 3 implementacoes diferentes de autenticacao (so 1 usada).

O objetivo e reestruturar sem reescrever: mesmo design visual, mesma stack, mesmo deploy na Vercel, mas codigo limpo e modular.

Estrutura Final de Arquivos

Site/
  assets/
    js/api-helper.js              # MANTER (ajustes menores)
    css/tailwind.css              # NOVO: CSS compilado (substitui CDN)
    css/shared.css                # NOVO: fontes, animacoes compartilhadas
  public/
    index.html                    # MODIFICAR: corrigir assets, lazy images
    albums.html                   # MODIFICAR: corrigir assets
  admin/
    index.html                    # MODIFICAR: reduzir p/ shell + imports
    js/
      app.js                     # NOVO: state, init, auth, switchTab
      tabs/hero.js               # NOVO: renderHero, preview
      tabs/sobre.js              # NOVO: renderSobre
      tabs/portfolio.js          # NOVO: renderPortfolio, drag/drop, editor
      tabs/albuns.js             # NOVO: renderAlbuns
      tabs/estudio.js            # NOVO: renderEstudio, whatsapp msgs
      tabs/faq.js                # NOVO: renderFAQ, CRUD
      tabs/manutencao.js         # NOVO: renderMaintenance
      tabs/footer.js             # NOVO: renderFooter (definicao UNICA)
      tabs/newsletter.js         # NOVO: renderNewsletter, export
      tabs/sessoes.js            # NOVO: renderSessoes
      utils/upload.js            # NOVO: compressImage, uploadImage, progress
      utils/helpers.js           # NOVO: resolveImagePath
  cliente/
    index.html                   # MODIFICAR: corrigir assets
  src/
    server.js                    # MODIFICAR: reduzir de 738 -> ~60 linhas
    routes/
      auth.js                   # NOVO: login, verify
      hero.js                   # NOVO: GET/PUT hero (via MongoDB)
      faq.js                    # NOVO: CRUD FAQ (via MongoDB)
      site-data.js              # NOVO: GET/PUT site-data
      newsletter.js             # NOVO: subscribe, list, delete
      sessions.js               # NOVO: client verify, photos, admin CRUD
      upload.js                 # NOVO: admin upload
    middleware/
      auth.js                   # NOVO: authenticateToken (unica fonte)
    models/
      SiteData.js               # MODIFICAR: adicionar campo faq
      Session.js                # MANTER
      Newsletter.js             # MANTER
    config/
      cloudinary.js             # NOVO: cloudinary + multer unificados
Arquivos DELETADOS:

src/routes/api.js (516 linhas - nunca importado)
src/middleware/auth.js (24 linhas - so usado no api.js morto)
src/helpers/auth-helper.js (50 linhas - nunca importado)
src/helpers/data-helper.js (115 linhas - nunca importado)
src/config/database.js (66 linhas - nunca importado)
src/data/fallback-data.js (49 linhas - nunca importado)
src/data/hero-data.json (migrado pro MongoDB)
src/data/faq-data.json (migrado pro MongoDB)
api/index.js (se existir - entry point alternativo nao usado)
Fases de Implementacao
FASE 1: Deletar Codigo Morto (~960 linhas)
Remover os 7 arquivos que nunca sao importados por server.js (unico entry point no vercel.json).

Arquivos para deletar:

src/routes/api.js
src/middleware/auth.js
src/helpers/auth-helper.js
src/helpers/data-helper.js
src/config/database.js
src/data/fallback-data.js
api/index.js (se existir)
Risco: Zero. Nenhum desses e importado.

FASE 2: Modularizar Backend
Extrair rotas do server.js monolitico para modulos Express Router.

Criar src/config/cloudinary.js: mover config do Cloudinary + setup do multer (memory e disk)
Criar src/middleware/auth.js: mover funcao authenticateToken (unica fonte de verdade)
Criar arquivos de rota:
src/routes/auth.js (~30 linhas): handleLogin, POST /login, POST /auth/login, POST /auth/verify
src/routes/upload.js (~40 linhas): POST /admin/upload
src/routes/hero.js (~60 linhas): GET/PUT /hero (ainda JSON nesta fase)
src/routes/site-data.js (~80 linhas): GET/PUT /site-data, GET /site-config, POST /admin/site-config
src/routes/newsletter.js (~40 linhas): subscribe, list, delete
src/routes/faq.js (~130 linhas): CRUD completo + move
src/routes/sessions.js (~170 linhas): verify-code, photos, session CRUD
Reduzir server.js para ~60 linhas: app setup + app.use('/api', require('./routes/xxx'))
Risco: Baixo. Extracao mecanica sem mudar logica.

FASE 3: Migrar Hero + FAQ para MongoDB
Eliminar fs.writeFileSync que quebra silenciosamente na Vercel (filesystem read-only).

Atualizar SiteData.js: adicionar campo faq: { faqs: Array } no schema
Script de migracao: ler hero-data.json + faq-data.json e inserir no MongoDB (executar uma vez)
Reescrever src/routes/hero.js: GET/PUT usando SiteData.findOne() em vez de fs.readFileSync
Reescrever src/routes/faq.js: CRUD usando MongoDB em vez de JSON file
Deletar src/data/hero-data.json e src/data/faq-data.json
Manter endpoint /api/hero inalterado (frontend nao precisa mudar)
Risco: Medio. Requer rodar migracao antes de deploy. Dados existem no git como backup.

FASE 4: Corrigir Performance do Frontend
Eliminar os loads bloqueantes que causam travamento.

Substituir TailwindCSS CDN por CSS compilado:

npm install -D tailwindcss
Criar tailwind.config.js + assets/css/tailwind-input.css
Adicionar script: "build:css": "npx tailwindcss -i ./assets/css/tailwind-input.css -o ./assets/css/tailwind.css --minify"
Substituir <script src="cdn.tailwindcss.com"> por <link rel="stylesheet" href="/assets/css/tailwind.css">
Rodar npm run build:css antes de cada deploy
Fixar versao do Lucide Icons: trocar @latest por versao especifica (ex: @0.460.0)

Corrigir Google Fonts: trocar @import url(...) dentro de <style> por <link rel="preconnect"> + <link rel="stylesheet"> no <head>

Adicionar loading="lazy" em todas as imagens (exceto hero que e above-the-fold)

Reduzir chamadas a lucide.createIcons(): chamar 1x ao final de cada ciclo de render, nao dentro de cada sub-render

Extrair CSS compartilhado para assets/css/shared.css (fontes, animacoes)

Risco: Baixo. Mudancas visuais devem ser zero.

FASE 5: Corrigir Seguranca
Hash de senha com bcrypt:

npm install bcryptjs
Usar bcrypt.compareSync() no login
Suportar env var ADMIN_PASSWORD_HASH (backward-compatible com ADMIN_PASSWORD)
Remover fallback inseguro do JWT secret: em prod, exigir JWT_SECRET definido

Proteger endpoint de fotos do cliente: verificar access code no GET /api/client/photos/:sessionId

Usar crypto.randomBytes para gerar access codes em vez de Math.random()

Risco: Baixo com backward compatibility.

FASE 6: Modularizar Admin Frontend
Quebrar admin/index.html (2100+ linhas) em ES modules.

Criar admin/js/utils/helpers.js: exportar resolveImagePath
Criar admin/js/utils/upload.js: exportar compressImage, uploadImage, showUploadProgress
Criar 10 modulos de tab (admin/js/tabs/*.js): cada um exporta sua funcao render + handlers
Criar admin/js/app.js: state global (appData, authToken), switchTab, loadDados, saveDados, auth flow
Reduzir admin/index.html: manter so HTML (login + shell do painel) + <script type="module" src="/admin/js/app.js">
Eliminar renderFooter duplicado: manter so a segunda definicao (a que esta em efeito)
Expor funcoes no window para manter compatibilidade com onclick inline nos templates
Risco: Medio. Grande refator mecanico, testar cada tab.

FASE 7: Limpeza Final do Backend
Usar Mongoose corretamente: substituir SiteData.collection.updateOne() por SiteData.findOneAndUpdate() com runValidators: true
Remover console.logs de debug (os com emoji tipo console.log('...'))
Remover endpoint duplicado /api/auth/login (manter so /api/login)
Adicionar timestamps: true no model Session.js
Ordem de Execucao

FASE 1 (codigo morto)  ─────> FASE 2 (backend modular)  ──┬──> FASE 3 (MongoDB migration)
                                                           ├──> FASE 5 (seguranca)
                                                           └──> FASE 7 (limpeza backend)

FASE 1  ─────> FASE 4 (performance frontend)
FASE 1  ─────> FASE 6 (admin modular)
Fases 4 e 6 sao independentes entre si e podem ser feitas em paralelo com as fases 3/5/7.
Caminho critico: Fase 1 -> 2 -> 3 (corrige o bug da Vercel).

Verificacao
Apos cada fase:

Rodar npm run dev e testar localmente
Navegar por todas as paginas (publica, admin, cliente)
No admin: login, editar hero, salvar, verificar no site publico
No admin: cada aba (portfolio, albuns, estudio, FAQ, newsletter, sessoes, footer, manutencao)
Galeria do cliente: testar codigo de acesso
Deploy na Vercel e repetir testes em producao