# FS FOTOGRAFIAS - Roadmap: Marketing Intelligence

## Status: PLANEJADO (nao implementado)

Este documento descreve as funcionalidades futuras de integracao com Meta Ads API e Google Ads API para monitoramento de anuncios e funil de vendas.

---

## PRE-REQUISITOS (manual, fora do codigo)

### 1. Criar contas
- [ ] Meta Business Suite → [business.facebook.com](https://business.facebook.com)
- [ ] Pixel da Meta → criar e anotar o **1104480228414314**
- [ ] Google Ads → [ads.google.com](https://ads.google.com)
- [ ] Google Analytics 4 → [analytics.google.com](https://analytics.google.com) → anotar **Measurement ID** (G-XXXXXXX)
- [ ] Meta Conversions API → gerar **Access Token** no Events Manager

### 2. Variaveis de ambiente necessarias
```env
META_PIXEL_ID=                  # ID do Pixel da Meta
META_ACCESS_TOKEN=              # Token da Conversions API (CAPI)
META_AD_ACCOUNT_ID=             # ID da conta de anuncios (act_XXXXX)
GOOGLE_MEASUREMENT_ID=          # ID do Google Analytics (G-XXXXXXX)
GOOGLE_ADS_CUSTOMER_ID=         # ID da conta Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=     # Token de desenvolvedor Google Ads
```

---

## PASSO 1: Tracking no site (Pixel + CAPI + Google Tag)

### 1.1 Meta Pixel (client-side)
Adicionar no `<head>` do `public/index.html` e `cliente/index.html`:
```html
<script>
  !function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'SEU_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

### 1.2 Meta Conversions API - CAPI (server-side)
Criar `src/utils/metaEvents.js` para enviar eventos server-side:
```javascript
// Eventos a enviar:
// - PageView: quando usuario acessa o site
// - Lead: quando cliente acessa galeria (verify-code)
// - CompleteRegistration: quando cliente finaliza selecao
// - Contact: quando clica no WhatsApp
// - Subscribe: quando se inscreve na newsletter
```

### 1.3 Google Tag (gtag.js)
Adicionar no `<head>` do `public/index.html` e `cliente/index.html`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>
```

### 1.4 Eventos de conversao a trackear
| Evento | Onde acontece | Meta Event | Google Event |
|--------|---------------|------------|--------------|
| Visita ao site | public/index.html | PageView | page_view |
| Clique no WhatsApp | Botao WhatsApp | Contact | generate_lead |
| Newsletter | Formulario footer | Subscribe | sign_up |
| Acesso a galeria | cliente verify-code | Lead | login |
| Selecao de fotos | cliente select | AddToCart | add_to_cart |
| Finalizar selecao | cliente submit | CompleteRegistration | purchase |

---

## PASSO 2: Backend para coletar dados

### 2.1 Modelo MarketingEvent
```javascript
// src/models/MarketingEvent.js
{
  type: String,           // 'page_view', 'whatsapp_click', 'gallery_access', 'selection_submit', etc
  source: String,         // 'website', 'client_gallery'
  sessionId: String,      // ID da sessao (se aplicavel)
  metadata: {
    userAgent: String,
    ip: String,           // Para geo (anonimizado)
    referrer: String,
    device: String,       // 'mobile', 'desktop', 'tablet'
    city: String,         // Detectado via IP
    region: String
  },
  createdAt: Date
}
```

### 2.2 Rota de tracking
```javascript
// src/routes/tracking.js
// POST /api/track - recebe eventos do frontend (sem auth)
// Salva no MongoDB + envia para Meta CAPI
```

---

## PASSO 3: Integracao com APIs de Marketing

### 3.1 Meta Marketing API
Endpoint: `https://graph.facebook.com/v21.0/act_{AD_ACCOUNT_ID}/insights`

Dados a buscar:
- **Demograficos**: idade, genero do publico que interage
- **Geograficos**: cidade, regiao dos cliques
- **Performance**: impressoes, cliques, CTR, CPC, CPM
- **Conversoes**: leads, custo por lead (CPA)
- **Criativos**: qual anuncio performa melhor

Metricas cruciais para fotografo:
```
- reach (alcance)
- impressions (impressoes)
- clicks (cliques)
- ctr (taxa de clique)
- cpc (custo por clique)
- spend (gasto total)
- actions (conversoes por tipo)
- cost_per_action_type (custo por conversao)
- age, gender (breakdowns)
- region, city (breakdowns geograficos)
```

### 3.2 Google Ads API
Dados a buscar:
- **Palavras-chave**: quais termos trazem clientes
- **Performance por regiao**: ABC vs Zona Sul
- **Dispositivo**: mobile vs desktop
- **Horarios**: quando os clientes buscam

Palavras-chave relevantes para monitorar:
```
- "fotografo casamento sao bernardo"
- "fotografo aniversario abc"
- "estudio fotografico zona sul sp"
- "fotografo evento grande abc"
- "ensaio fotografico sbc"
- "book fotografico santo andre"
```

### 3.3 Google Analytics 4 Data API
Dados a buscar:
- **Origem do trafego**: organico, pago, redes sociais, direto
- **Comportamento**: paginas mais visitadas, tempo no site
- **Funil**: visita → portfolio → whatsapp/contato
- **Dispositivo e localizacao**

---

## PASSO 4: Dashboard no Admin

### 4.1 Nova aba "Marketing" no admin
Criar `admin/js/tabs/marketing.js` com:

**Visao Geral (cards)**
- Visitas hoje/semana/mes
- Leads gerados (acessos a galeria)
- Cliques no WhatsApp
- Custo por lead (Meta + Google)

**Demograficos (graficos)**
- Genero: % homem vs mulher
- Faixa etaria: 18-24, 25-34, 35-44, 45-54, 55+
- Insight: "80% do seu publico sao mulheres de 25-44 anos"

**Geografico (mapa/tabela)**
- Top bairros/cidades por clique e conversao
- CPA por regiao: "R$50 para Zona Sul, R$30 para ABC"
- Insight: "Clientes de Moema buscam ensaios, SBC busca cobertura de festas"

**Performance de Anuncios**
- Campanhas ativas com metricas
- Melhor criativo (foto de making-of vs foto da festa)
- CTR por tipo de anuncio

**Funil de Vendas**
```
Impressoes → Cliques → Visita ao site → WhatsApp/Lead → Contrato
   10.000      500         300              50            10
              (5%)        (60%)           (17%)          (20%)
```

**Insights Automaticos**
- "Mulheres 30-40 em Santo Andre convertem 3x mais"
- "Anuncios com foto de noiva tem CTR 40% maior"
- "Trafego mobile e 85% - priorize experiencia mobile"
- "Melhor horario para anuncios: 19h-22h"

### 4.2 Backend da aba Marketing
```javascript
// src/routes/marketing.js (com auth)
// GET /api/marketing/overview    - visao geral
// GET /api/marketing/demographics - dados demograficos
// GET /api/marketing/geographic   - dados por regiao
// GET /api/marketing/campaigns    - performance de campanhas
// GET /api/marketing/funnel       - funil de conversao
// GET /api/marketing/insights     - insights automaticos
```

### 4.3 Servico de sync
```javascript
// src/services/marketingSync.js
// Cron job (a cada 6 horas) que puxa dados das APIs da Meta e Google
// Salva no MongoDB para consulta rapida no dashboard
```

---

## PUBLICO-ALVO PARA CAMPANHAS

### Regiao de atuacao
- **Primaria**: Sao Bernardo do Campo, Santo Andre, Sao Caetano do Sul
- **Secundaria**: Zona Sul de SP (Moema, Vila Mariana, Jabaquara, Campo Belo)
- **Terciaria**: Diadema, Maua, Ribeirao Pires

### Segmentos de interesse (Meta)
- Noivas recentes (3 meses, 6 meses, 1 ano)
- Maes com filhos pequenos (aniversarios infantis)
- Casais recém-casados (ensaios pos-wedding)
- Gestantes (ensaio gestante)
- Formandos (book de formatura)

### Funil por evento de vida
```
Noiva ha 3 meses  → Anuncio Pre-Wedding → Landing page ensaio
Noiva ha 6 meses  → Anuncio Casamento   → Landing page cobertura
Mae com filho 0-5 → Anuncio Aniversario → Landing page festa
Gestante           → Anuncio Ensaio      → Landing page estudio
```

---

## ORDEM DE IMPLEMENTACAO

1. **Criar contas** Meta Business + Google Ads + GA4
2. **Instalar Pixel + gtag.js** no site publico e galeria do cliente
3. **Criar modelo MarketingEvent** + rota de tracking
4. **Implementar Meta CAPI** (server-side events)
5. **Rodar campanhas** por 2-4 semanas para coletar dados
6. **Criar aba Marketing** no admin com metricas basicas
7. **Integrar Meta Marketing API** para dados de campanhas
8. **Integrar Google Ads API** para palavras-chave e performance
9. **Adicionar insights automaticos** baseados nos dados
10. **Criar funil visual** com taxas de conversao





token api facebook 

EAAM43TefjzIBQrprsubdIO3zFcBjOKjjBNkRVr9I4rIwy9DRJqrsaNSH0gXceoARhkPZBZB8aNdwvQQTTcgGMErCWjVDhEus3cf4TtDeSpj6tsIlsMUX7Ug68fewPbYMQ4WVl0DNkZCfZA1DZCHjAusrwVNffSr1vUYdajvYvQ25wZBqCTpbpUZB3WaL7yH7QZDZD



no admin teremos que ter um modo mais facial de inserir o codigo do pixel, por um formulario