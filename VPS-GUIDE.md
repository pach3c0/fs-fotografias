# Guia da VPS Contabo - Configuracao e Deploy de Novos Apps

> Este documento serve como referencia para qualquer IA ou desenvolvedor que precise
> fazer deploy de um novo aplicativo nesta VPS sem interferir nos apps existentes.

---

## 1. DADOS DA VPS

| Item | Valor |
|------|-------|
| **Provedor** | Contabo |
| **IP** | `5.189.174.18` |
| **OS** | Ubuntu (com Nginx 1.24) |
| **Acesso SSH** | `ssh root@5.189.174.18` |
| **Node.js** | v22 (instalado via nvm ou apt) |
| **Process Manager** | PM2 |
| **Banco de dados** | MongoDB local (`localhost:27017`) |
| **Web Server / Reverse Proxy** | Nginx |
| **SSL** | Let's Encrypt via Certbot |

---

## 2. ESTRUTURA ATUAL

### 2.1 App rodando: CLIQUE·ZOOM

| Item | Valor |
|------|-------|
| **Path no disco** | `/var/www/clique-zoom` |
| **Dominio** | `cliquezoom.com.br` e `www.cliquezoom.com.br` |
| **Porta interna** | `3000` |
| **Processo PM2** | `cliquezoom` (id 0) |
| **Database MongoDB** | `cliquezoom` |
| **Nginx config** | `/etc/nginx/sites-available/cliquezoom` |
| **Tipo** | Node.js (Express) + MongoDB |

### 2.2 App rodando: FS FOTOGRAFIAS

| Item | Valor |
|------|-------|
| **Path no disco** | `/var/www/fs-fotografias` |
| **Dominio** | `fsfotografias.com.br` e `www.fsfotografias.com.br` |
| **Porta interna** | `3002` |
| **Processo PM2** | `fsfotografias` |
| **Database MongoDB** | `fsfotografias` |
| **Nginx config** | `/etc/nginx/sites-available/fsfotografias` |
| **Tipo** | Node.js (Express) + MongoDB (clone do CLIQUE·ZOOM) |
| **Repositorio Git** | Separado do CLIQUE·ZOOM |

### 2.3 App rodando: CRM SaaS

| Item | Valor |
|------|-------|
| **Porta interna** | `3001` |
| **Tipo** | Python (Uvicorn/FastAPI) + PostgreSQL |

### 2.4 Nginx do CLIQUE·ZOOM

Arquivo: `/etc/nginx/sites-available/cliquezoom`

```nginx
server {
    listen 80;
    server_name cliquezoom.com.br www.cliquezoom.com.br;
    # (Certbot redireciona para HTTPS automaticamente)

    client_max_body_size 50M;

    location /uploads/ {
        alias /var/www/clique-zoom/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        alias /var/www/clique-zoom/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /admin/js/ {
        alias /var/www/clique-zoom/admin/js/;
        types { application/javascript js; }
        expires 1d;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Bloco HTTPS (gerado pelo Certbot) escuta na porta 443
# com certificado em /etc/letsencrypt/live/cliquezoom.com.br/
```

### 2.5 Portas em uso

| Porta | App |
|-------|-----|
| 80 | Nginx (HTTP → redireciona para 443) |
| 443 | Nginx (HTTPS) |
| 3000 | CLIQUE·ZOOM (Node.js/Express) |
| 3001 | CRM SaaS (Python/Uvicorn) |
| 3002 | FS FOTOGRAFIAS (Node.js/Express) |
| 5432 | PostgreSQL |
| 27017 | MongoDB |

---

## 3. COMO FAZER DEPLOY DE UM NOVO APP

### 3.1 Escolher uma porta livre

Os apps atuais usam as portas `3000`, `3001` e `3002`. O novo app DEVE usar uma porta diferente.

Portas sugeridas para novos apps:
- `3003` - proximo app disponivel
- `3004` - quinto app
- `3005` - sexto app
- etc.

**NUNCA** use as portas `3000` (CLIQUE·ZOOM), `3001` (CRM), `3002` (FS FOTOGRAFIAS), `80`, `443`, `5432` ou `27017`.

Para verificar portas em uso:
```bash
ss -tlnp | grep LISTEN
```

### 3.2 Criar diretorio do app

```bash
# Padrao: /var/www/nome-do-app
sudo mkdir -p /var/www/nome-do-app
cd /var/www/nome-do-app

# Se usar Git:
git clone https://github.com/usuario/repo.git .

# Se for upload manual:
# Transfira os arquivos via scp, rsync ou outro metodo
```

### 3.3 Instalar dependencias

```bash
cd /var/www/nome-do-app
npm install
```

### 3.4 Configurar variaveis de ambiente

Crie o arquivo `.env` na raiz do app:
```bash
nano /var/www/nome-do-app/.env
```

Exemplo:
```env
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/nome_do_banco
# Adicione outras variaveis necessarias
```

**IMPORTANTE sobre MongoDB:**
- O MongoDB ja esta rodando em `localhost:27017`
- Cada app deve usar um banco de dados DIFERENTE (nome diferente na URI)
- Exemplo: `mongodb://localhost:27017/meu_crm` (banco `meu_crm`)
- Os bancos sao isolados, um app NAO interfere no banco do outro

### 3.5 Iniciar com PM2

```bash
cd /var/www/nome-do-app

# Iniciar o processo (ajuste o arquivo de entrada conforme seu app)
pm2 start src/server.js --name "nome-do-app"
# ou
pm2 start npm --name "nome-do-app" -- start
# ou
pm2 start ecosystem.config.js

# Salvar para auto-restart apos reboot
pm2 save

# Verificar status
pm2 list
```

Comandos uteis do PM2:
```bash
pm2 list                    # Listar todos os processos
pm2 logs nome-do-app        # Ver logs
pm2 restart nome-do-app     # Reiniciar
pm2 stop nome-do-app        # Parar
pm2 delete nome-do-app      # Remover
pm2 monit                   # Monitor em tempo real
```

### 3.6 Configurar Nginx (reverse proxy)

Criar arquivo de configuracao:
```bash
sudo nano /etc/nginx/sites-available/nome-do-app
```

Conteudo (substituir valores):
```nginx
server {
    listen 80;
    server_name meudominio.com.br www.meudominio.com.br;

    client_max_body_size 50M;

    # Se o app tiver arquivos estaticos, adicionar locations:
    # location /uploads/ {
    #     alias /var/www/nome-do-app/uploads/;
    #     expires 30d;
    # }

    location / {
        proxy_pass http://127.0.0.1:3001;  # PORTA DO NOVO APP
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar o site:
```bash
# Criar link simbolico
sudo ln -s /etc/nginx/sites-available/nome-do-app /etc/nginx/sites-enabled/

# Testar configuracao (SEMPRE testar antes de recarregar!)
sudo nginx -t

# Se o teste passar, recarregar
sudo systemctl reload nginx
```

### 3.7 Configurar SSL (HTTPS)

```bash
sudo certbot --nginx -d meudominio.com.br -d www.meudominio.com.br
```

O Certbot modifica o arquivo Nginx automaticamente para:
- Escutar na porta 443 com certificado SSL
- Redirecionar HTTP (80) para HTTPS (443)
- Renovacao automatica do certificado

### 3.8 Configurar DNS do novo dominio

No registrador do dominio, criar registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | `5.189.174.18` |
| A ou CNAME | www | `5.189.174.18` ou `meudominio.com.br` |

---

## 4. CASO ESPECIAL: SUBDOMINIO DO MESMO DOMINIO

Se o novo app usar um subdominio do cliquezoom (ex: `crm.cliquezoom.com.br`):

### DNS
No registrador, adicionar:

| Tipo | Nome | Valor |
|------|------|-------|
| A | crm | `5.189.174.18` |

### Nginx
```nginx
server {
    listen 80;
    server_name crm.cliquezoom.com.br;

    location / {
        proxy_pass http://127.0.0.1:3001;
        # ... mesmos headers do exemplo acima
    }
}
```

### SSL
```bash
sudo certbot --nginx -d crm.cliquezoom.com.br
```

---

## 5. CHECKLIST PARA DEPLOY DE NOVO APP

- [ ] Escolher porta livre (ex: 3001, 3002...)
- [ ] Criar diretorio em `/var/www/nome-do-app`
- [ ] Clonar repositorio ou transferir arquivos
- [ ] Instalar dependencias (`npm install`)
- [ ] Criar arquivo `.env` com `PORT`, `MONGODB_URI`, etc.
- [ ] Usar nome de banco MongoDB diferente dos existentes
- [ ] Iniciar com PM2 (`pm2 start ... --name "nome"`)
- [ ] Salvar PM2 (`pm2 save`)
- [ ] Criar config Nginx em `/etc/nginx/sites-available/`
- [ ] Ativar com link simbolico em `/etc/nginx/sites-enabled/`
- [ ] Testar Nginx (`sudo nginx -t`)
- [ ] Recarregar Nginx (`sudo systemctl reload nginx`)
- [ ] Configurar DNS (registro A apontando para `5.189.174.18`)
- [ ] Instalar SSL (`sudo certbot --nginx -d dominio`)
- [ ] Testar acesso pelo navegador
- [ ] Verificar logs (`pm2 logs nome-do-app`)

---

## 6. COMANDOS DE MANUTENCAO

```bash
# --- PM2 ---
pm2 list                         # Ver todos os processos
pm2 logs                         # Logs de todos os apps
pm2 logs nome-do-app --lines 50  # Ultimas 50 linhas de um app
pm2 restart all                  # Reiniciar tudo
pm2 restart nome-do-app          # Reiniciar um app
pm2 save                         # Salvar estado (para auto-restart)
pm2 startup                      # Configurar PM2 para iniciar no boot

# --- Nginx ---
sudo nginx -t                    # Testar configuracao
sudo systemctl reload nginx      # Recarregar (sem downtime)
sudo systemctl restart nginx     # Reiniciar
sudo systemctl status nginx      # Status
ls /etc/nginx/sites-enabled/     # Ver sites ativos

# --- MongoDB ---
mongosh                          # Acessar shell do MongoDB
show dbs                         # Listar bancos de dados
sudo systemctl status mongod     # Status do MongoDB
sudo systemctl restart mongod    # Reiniciar MongoDB

# --- SSL ---
sudo certbot certificates        # Ver certificados instalados
sudo certbot renew --dry-run     # Testar renovacao
sudo certbot renew               # Renovar certificados

# --- Sistema ---
df -h                            # Espaco em disco
free -h                          # Memoria RAM
htop                             # Monitor de processos
ss -tlnp | grep LISTEN           # Portas em uso
```

---

## 7. TROUBLESHOOTING

| Problema | Causa provavel | Solucao |
|----------|---------------|---------|
| 502 Bad Gateway | App Node.js nao esta rodando | `pm2 restart nome-do-app` e checar `pm2 logs` |
| 404 Not Found | Nginx nao tem config para o dominio | Criar/ativar config em sites-available/enabled |
| ERR_CONNECTION_REFUSED | Porta errada no proxy_pass | Verificar se a porta no Nginx = porta do app |
| App nao inicia | Porta ja em uso | `ss -tlnp | grep PORTA` e escolher outra |
| App nao inicia | MongoDB desligado | `sudo systemctl start mongod` |
| SSL nao funciona | DNS nao propagou | Aguardar propagacao e rodar certbot depois |
| Conflito entre apps | Mesma porta ou mesmo banco | Usar portas e bancos diferentes |

---

## 8. DIAGRAMA DA ARQUITETURA

```
Internet
    |
    v
Nginx (porta 80/443)
    |
    |-- cliquezoom.com.br ---------> localhost:3000 (CLIQUE·ZOOM)
    |                                     |
    |                                     +--> MongoDB: cliquezoom
    |
    |-- crm.cliquezoom.com.br ----> localhost:3001 (CRM SaaS)
    |                                     |
    |                                     +--> PostgreSQL: crm
    |
    |-- fsfotografias.com.br -----> localhost:3002 (FS FOTOGRAFIAS)
    |                                     |
    |                                     +--> MongoDB: fsfotografias
    |
    v
PM2 gerencia todos os processos Node.js
MongoDB local atende todos os bancos em localhost:27017
PostgreSQL local atende o CRM em localhost:5432
```

---

## 9. REGRAS IMPORTANTES

1. **NUNCA** altere a config Nginx de apps existentes ao configurar um novo app
2. **NUNCA** use as portas `3000` (CLIQUE·ZOOM), `3001` (CRM) ou `3002` (FS FOTOGRAFIAS)
3. **NUNCA** use os bancos `cliquezoom` ou `fsfotografias` no MongoDB (pertencem a apps existentes)
4. **SEMPRE** teste o Nginx com `nginx -t` antes de recarregar
5. **SEMPRE** salve o PM2 com `pm2 save` apos adicionar novo processo
6. **SEMPRE** use HTTPS em producao (Certbot e gratuito)
7. Cada app deve ter seu proprio arquivo em `/etc/nginx/sites-available/`
8. Cada app deve ter seu proprio processo no PM2 com nome unico
9. Cada app deve usar uma porta unica
10. Cada app deve usar um banco MongoDB com nome unico
