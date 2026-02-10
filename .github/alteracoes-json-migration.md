# Alterações - Migração de Dados para JSON

## ✅ Alterações Realizadas

### 1. FAQ (Concluído)
- **Data**: Início da conversa
- **Arquivos Criados**: `/src/data/faq-data.json`
- **Alterações no Backend**:
  - Adicionadas rotas CRUD em `/src/server.js`: GET, POST, PUT, DELETE `/api/faq`
  - Funções de I/O: `readFAQData()`, `writeFAQData()`
- **Alterações no Frontend**:
  - `/public/index.html`: Adicionado `loadFAQs()` e `renderFAQs()`, seção de FAQ com accordion
  - `/admin/index.html`: Adicionado tab FAQ com `renderFAQ()`, funções de gerenciamento (add, edit, delete, move)
- **Status**: ✅ Funcionando em produção

### 2. Hero (Concluído)
- **Data**: Fase recente
- **Arquivos Criados**: `/src/data/hero-data.json`
- **Alterações no Backend**:
  - Adicionadas rotas GET/PUT `/api/hero` em `/src/server.js`
  - Funções de I/O: `readHeroData()`, `writeHeroData()`
- **Alterações no Frontend**:
  - `/public/index.html`: Modificado `loadRemoteData()` para carregar `/api/hero`, fallback para campos de imagem e posicionamento
  - `/admin/index.html`: Modificado `saveDados()` para salvar Hero em `/api/hero` (além de MongoDB)
- **Status**: ✅ Funcionando em produção, imagem corrigida (Cloudinary)

---

## 📋 Próximas Alterações Planejadas

### 3. About (Pendente)
- **Objetivo**: Migrar seção "Sobre" de MongoDB para JSON
- **Arquivo a Criar**: `/src/data/about-data.json`
- **Dados a Incluir**:
  - Título, descrição/texto
  - Imagem e transformações (escala, posição)
  - Posicionamento de texto
- **Rotas a Adicionar**:
  - GET `/api/about`
  - PUT `/api/about` (authenticated)
- **Alterações Frontend**:
  - `/public/index.html`: Carregar de `/api/about`
  - `/admin/index.html`: Salvar About em `/api/about`

### 4. Studio (Pendente)
- **Objetivo**: Migrar seção "Estúdio" de MongoDB para JSON
- **Arquivo a Criar**: `/src/data/studio-data.json`
- **Dados a Incluir**:
  - Título, descrição
  - Localização, horários, informações de contato
  - Imagem/galeria de fotos
- **Rotas a Adicionar**:
  - GET `/api/studio`
  - PUT `/api/studio` (authenticated)
- **Alterações Frontend**:
  - `/public/index.html`: Carregar de `/api/studio`
  - `/admin/index.html`: Salvar Studio em `/api/studio`

### 5. Footer (Pendente)
- **Objetivo**: Migrar rodapé de MongoDB para JSON
- **Arquivo a Criar**: `/src/data/footer-data.json`
- **Dados a Incluir**:
  - Links de redes sociais
  - Informações de contato
  - Copyright/mensagens
- **Rotas a Adicionar**:
  - GET `/api/footer`
  - PUT `/api/footer` (authenticated)
- **Alterações Frontend**:
  - `/public/index.html`: Carregar de `/api/footer`
  - `/admin/index.html`: Salvar Footer em `/api/footer`

---

## 📝 Padrão de Implementação

Cada migração segue este padrão:

1. **Criar arquivo JSON** em `/src/data/`
2. **Adicionar funções I/O** em `/src/server.js` (read + write)
3. **Adicionar rotas API** em `/src/server.js` (GET + PUT)
4. **Modificar `/public/index.html`** para carregar do endpoint
5. **Modificar `/admin/index.html`** para salvar no endpoint
6. **Testar** em desenvolvimento e produção
7. **Fazer commit** com mensagem clara

---

## 🔄 Ordem Recomendada
1. About (próximo)
2. Studio
3. Footer

