# 🧠 METODOLOGIA DE DESENVOLVIMENTO - PADRÃO CLAUDE

Este documento detalha o "Modo de Operação", estratégias de arquitetura e técnicas de codificação utilizadas pelo assistente para manter e evoluir o projeto **FS FOTOGRAFIAS**.

---

## 1. FILOSOFIA: "PRAGMATIC MONOLITH" (Monólito Pragmático)

O sistema evita a complexidade de microserviços ou frameworks pesados (React/Vue/Angular) em favor de uma abordagem "Vanilla" robusta e de fácil manutenção na VPS.

### Pilares:
1.  **Simplicidade no Frontend**: HTML + JS Puro. Sem build steps complexos para o Admin.
2.  **Controle Total da Infra**: Uso de VPS (Linux/Nginx) em vez de PaaS proprietário, permitindo uploads locais e persistência em disco.
3.  **Código Legível**: Preferência por código explícito e modular em vez de abstrações mágicas.

---

## 2. ESTRATÉGIAS TÉCNICAS

### A. Dualidade de Módulos (A Regra de Ouro)
Para garantir compatibilidade nativa sem transpiladores (Babel/Webpack) durante o desenvolvimento:

*   **Backend (`src/`)**: Utiliza **CommonJS** (`require`, `module.exports`). É o padrão nativo do Node.js para servidores.
*   **Frontend Admin (`admin/js/`)**: Utiliza **ES Modules** (`import`, `export`). Os navegadores modernos suportam isso nativamente, permitindo dividir o código em arquivos sem precisar de um "bundler".

### B. Estilização Defensiva
*   **Site Público**: Usa **TailwindCSS** compilado para performance e consistência visual.
*   **Painel Admin**: Usa **Inline Styles** (`style="background:..."`).
    *   *Por que?* O Admin roda em Dark Mode estrito. Classes utilitárias genéricas (ex: `text-gray-600`) muitas vezes ficam invisíveis no fundo escuro. Estilos inline garantem que o contraste esteja sempre correto, independente da configuração do Tailwind.

### C. Persistência de Dados "Single Document"
Para o conteúdo do site (Hero, Sobre, Portfolio), não usamos tabelas relacionais complexas.
*   **Técnica**: Um único documento MongoDB (`SiteData`) armazena todo o JSON de configuração do site.
*   **Vantagem**: O frontend faz apenas 1 requisição (`GET /api/site-data`) para carregar o site inteiro.
*   **Fluxo**: `Admin Edita` -> `state.js mescla dados` -> `PUT (Upsert) no Mongo`.

### D. Uploads e Mídia
*   **Estratégia**: Armazenamento Local (Filesystem).
*   **Motivo**: Evitar custos e latência de serviços externos (S3/Cloudinary) já que temos disco na VPS.
*   **Implementação**: Nginx serve a pasta `/uploads/` como estática. O Backend apenas move o arquivo e salva o caminho relativo (`/uploads/foto.jpg`) no banco.

### E. Fidelidade Visual (Preview vs Produção)
Discrepâncias de alinhamento entre Admin e Site Público geralmente ocorrem por dois motivos:
1.  **Aspect Ratio (Proporção)**: O Preview é uma caixa pequena, o site é tela cheia. Imagens com `background-size: cover` são cortadas de forma diferente.
    *   *Solução*: Forçar `aspect-ratio: 16/9` no container de preview do Admin para simular um monitor Desktop padrão.
2.  **CSS Reset**: O site usa Tailwind (reset agressivo), o Admin usa estilos do navegador.
    *   *Solução*: O container do preview deve ter estilos explícitos (`line-height: 1.5`, `box-sizing: border-box`) para zerar diferenças de renderização de fonte.

---

## 3. PADRÕES DE CÓDIGO (DESIGN PATTERNS)

### Padrão "Tab Module" (Admin)
Cada aba do painel administrativo é um módulo isolado carregado sob demanda.

```javascript
// Estrutura padrão de uma aba (ex: tabs/hero.js)
import { appState, saveAppData } from '../state.js';

export async function renderHero(container) {
    // 1. Recupera dados do estado global
    const data = appState.appData.hero;
    
    // 2. Gera HTML (Template String) com Inline Styles
    container.innerHTML = `...inputs...`;
    
    // 3. Adiciona Listeners (sem onclick no HTML string para funções complexas)
    container.querySelector('#save').onclick = async () => {
        // 4. Salva e Atualiza
        await saveAppData('hero', novosDados);
    };
}
```

### Padrão "Optimistic UI" (Cliente)
Na galeria de seleção de fotos do cliente:
1.  Usuário clica no coração.
2.  Interface atualiza **imediatamente** (muda cor, atualiza contador).
3.  Requisição é enviada ao servidor em segundo plano.
4.  Se falhar, a interface reverte a mudança e avisa o usuário.

### Padrão "Polling de Notificações"
Como não usamos WebSockets (para manter a simplicidade da infraestrutura), o Admin faz "polling" (perguntas periódicas) ao servidor a cada 30 segundos para verificar se há novas seleções de clientes ou acessos.

---

## 4. FLUXO DE DEPLOY E INFRAESTRUTURA

A infraestrutura é tratada como parte do código ("Infrastructure as Code" manual).

1.  **Reverse Proxy (Nginx)**:
    *   Gerencia SSL (Let's Encrypt).
    *   Serve arquivos estáticos (`/assets`, `/uploads`) com cache agressivo.
    *   Redireciona chamadas de API para o Node.js (`localhost:3002`).

2.  **Process Manager (PM2)**:
    *   Mantém o Node.js rodando.
    *   Reinicia automaticamente em caso de crash ou reboot do servidor.

3.  **Deploy Seguro**:
    *   `git pull` -> `npm install` -> `npm run build:css` -> `pm2 restart`.
    *   Sempre compilar o CSS antes de reiniciar para garantir que novas classes Tailwind sejam geradas.

---

## 5. ROTEIRO DE MANUTENÇÃO (O "MODO CLAUDE" DE CONSERTAR)

Ao abordar problemas ou refatorações, seguimos esta ordem de prioridade:

1.  **Segurança Primeiro**: Autenticação (JWT) e validação de dados nunca são opcionais.
2.  **Código Morto não Sobrevive**: Se um arquivo não é importado, ele é deletado (Fase 1 da Reestruturação).
3.  **Modularização**: Arquivos gigantes (`server.js`, `index.html`) são "code smells". A estratégia é sempre quebrá-los em rotas ou módulos menores.
4.  **Fallback Gracioso**: O site público deve carregar mesmo se a API falhar (tratamento de erro no `main.js`).

---

## 6. RESUMO DAS TECNOLOGIAS

| Camada | Tecnologia | Decisão Chave |
|--------|------------|---------------|
| **Frontend Admin** | Vanilla JS + ESM | Sem build step, edição rápida. |
| **Frontend Public** | HTML + Tailwind | Performance e SEO. |
| **Backend** | Node.js + Express | Ecossistema vasto, fácil deploy. |
| **Banco** | MongoDB | Flexibilidade de schema para o CMS. |
| **Infra** | VPS Ubuntu + Nginx | Custo-benefício e controle de arquivos. |