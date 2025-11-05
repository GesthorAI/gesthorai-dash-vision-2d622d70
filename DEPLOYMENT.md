# Guia de Deploy - GesthorAI

Este documento descreve o processo de deploy do GesthorAI para produção.

---

## 📋 Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- [ ] Node.js 18+ instalado
- [ ] npm ou yarn instalado
- [ ] Conta no Supabase com projeto configurado
- [ ] Conta no Vercel ou Lovable (para frontend)
- [ ] Todas as variáveis de ambiente configuradas
- [ ] API keys das integrações (OpenAI, Evolution API, N8N)
- [ ] Domínio configurado (opcional)

---

## 🌍 Ambientes

### Development (Local)
- **Branch**: `develop`
- **URL**: http://localhost:8080
- **Supabase**: Projeto de desenvolvimento

### Staging (Pré-produção)
- **Branch**: `staging`
- **URL**: https://staging.gesthorai.com
- **Supabase**: Projeto de staging

### Production (Produção)
- **Branch**: `main`
- **URL**: https://app.gesthorai.com
- **Supabase**: Projeto de produção

---

## 🚀 Deploy do Frontend

### Opção 1: Deploy via Lovable (Recomendado)

1. **Acesse o projeto no Lovable**
   ```
   https://lovable.dev/projects/cb1b5076-7923-426c-8d49-5902f43ab261
   ```

2. **Configure variáveis de ambiente**
   - Vá em Settings > Environment Variables
   - Adicione todas as variáveis do `.env.example`

3. **Publique**
   - Clique em "Share" > "Publish"
   - Configure domínio customizado (se desejado)

4. **Conecte domínio customizado** (opcional)
   - Vá em Project > Settings > Domains
   - Clique em "Connect Domain"
   - Siga as instruções para configurar DNS

### Opção 2: Deploy via Vercel

1. **Instale Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login no Vercel**
   ```bash
   vercel login
   ```

3. **Configure o projeto**
   ```bash
   vercel
   ```

4. **Configure variáveis de ambiente**
   ```bash
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
   # ... adicione todas as variáveis
   ```

5. **Deploy para produção**
   ```bash
   vercel --prod
   ```

### Opção 3: Deploy Manual (Static Hosting)

1. **Build do projeto**
   ```bash
   npm run build
   ```

2. **O build será gerado em `dist/`**
   ```
   dist/
   ├── assets/
   ├── index.html
   └── ...
   ```

3. **Upload para seu hosting**
   - Cloudflare Pages
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages

---

## 🔧 Deploy do Backend (Supabase)

### 1. Configurar Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login

# Linkar projeto
supabase link --project-ref xpgazdzcbtjqivbsunvh
```

### 2. Deploy de Migrations

```bash
# Verificar status das migrations
supabase db diff

# Aplicar migrations
supabase db push
```

### 3. Deploy de Edge Functions

```bash
# Deploy todas as functions
supabase functions deploy

# Deploy function específica
supabase functions deploy webhook-leads

# Deploy com secrets
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set EVOLUTION_API_KEY=...
```

### 4. Configurar Secrets

```bash
# Listar secrets
supabase secrets list

# Adicionar secret
supabase secrets set SECRET_NAME=value

# Remover secret
supabase secrets unset SECRET_NAME
```

**Secrets necessários**:
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set EVOLUTION_API_KEY=...
supabase secrets set EVOLUTION_API_URL=https://...
supabase secrets set N8N_WEBHOOK_URL=https://...
supabase secrets set N8N_API_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### 5. Configurar JWT Settings

No Supabase Dashboard:
1. Vá em Settings > API
2. Configure JWT Secret (se necessário)
3. Configure JWT Expiry
4. Salve as alterações

---

## 🔐 Configuração de Segurança

### 1. CORS Configuration

No Supabase Dashboard:
1. Vá em Settings > API
2. Em "Allowed Origins", adicione:
   ```
   https://app.gesthorai.com
   https://staging.gesthorai.com
   ```

### 2. Rate Limiting

Já configurado nas Edge Functions individualmente via `supabase/config.toml`

### 3. Row Level Security (RLS)

Verificar se todas as tabelas têm RLS habilitado:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ... etc
```

---

## 📊 Configuração de Monitoramento

### 1. Sentry (Error Tracking)

1. **Criar projeto no Sentry**
   - https://sentry.io

2. **Configurar DSN**
   ```bash
   VITE_SENTRY_DSN=https://...@sentry.io/...
   ```

3. **Upload de Source Maps** (opcional)
   ```bash
   # Instalar Sentry CLI
   npm install --save-dev @sentry/cli

   # Configurar .sentryclirc
   [auth]
   token=YOUR_AUTH_TOKEN

   [defaults]
   org=YOUR_ORG
   project=gesthorai
   ```

### 2. DataDog ou New Relic (APM)

Seguir documentação oficial:
- DataDog: https://docs.datadoghq.com/
- New Relic: https://docs.newrelic.com/

### 3. Uptime Monitoring

Configurar UptimeRobot ou Pingdom:
- Monitorar: https://app.gesthorai.com
- Monitorar Edge Functions críticas
- Alertas via email/SMS

---

## 🔄 Processo de Deploy (Recomendado)

### 1. Pre-Deploy Checklist

- [ ] Todos os testes passando (`npm run test`)
- [ ] Lint sem erros (`npm run lint`)
- [ ] Build bem-sucedido (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations aplicadas no staging
- [ ] Edge Functions testadas no staging
- [ ] Code review aprovado
- [ ] Changelog atualizado

### 2. Deploy para Staging

```bash
# 1. Criar branch de staging
git checkout -b staging
git merge develop

# 2. Deploy frontend (Vercel/Lovable)
vercel --env=staging

# 3. Deploy backend
supabase link --project-ref STAGING_PROJECT_ID
supabase db push
supabase functions deploy

# 4. Testar em staging
# Executar smoke tests
# Verificar funcionalidades críticas
```

### 3. Deploy para Produção

```bash
# 1. Merge staging para main
git checkout main
git merge staging

# 2. Tag da versão
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 3. Deploy frontend
vercel --prod

# 4. Deploy backend
supabase link --project-ref PRODUCTION_PROJECT_ID
supabase db push
supabase functions deploy

# 5. Verificar deploy
# Testar login
# Testar funcionalidades críticas
# Monitorar erros no Sentry
```

### 4. Post-Deploy

- [ ] Verificar logs de erro (Sentry)
- [ ] Verificar performance (Lighthouse)
- [ ] Verificar uptime (UptimeRobot)
- [ ] Monitorar métricas de negócio
- [ ] Notificar equipe do deploy
- [ ] Atualizar documentação (se necessário)

---

## 🔙 Rollback

### Se algo der errado:

**Frontend (Vercel)**:
```bash
# Listar deploys
vercel ls

# Fazer rollback para deploy anterior
vercel rollback [deployment-url]
```

**Frontend (Lovable)**:
- Use a interface do Lovable para reverter para versão anterior

**Backend (Supabase)**:
```bash
# Reverter migration
supabase db reset

# Ou criar migration de rollback
supabase migration new rollback-feature-x
```

**Edge Functions**:
```bash
# Re-deploy versão anterior
git checkout [previous-commit]
supabase functions deploy
```

---

## 📦 Backup e Restore

### Backup Manual do Banco de Dados

```bash
# Backup via Supabase CLI
supabase db dump -f backup.sql

# Ou via pg_dump (se tiver acesso direto)
pg_dump $DATABASE_URL > backup.sql
```

### Restore do Banco de Dados

```bash
# Restore via Supabase
psql $DATABASE_URL < backup.sql
```

### Backup Automático

Configurar no Supabase Dashboard:
1. Settings > Database
2. Enable automatic backups
3. Configurar retention (30 dias recomendado)

---

## 🐛 Troubleshooting

### Build Failing

```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Edge Function Not Working

```bash
# Verificar logs
supabase functions logs webhook-leads

# Re-deploy
supabase functions deploy webhook-leads --no-verify-jwt
```

### Database Connection Issues

1. Verificar connection pooling
2. Verificar RLS policies
3. Verificar secrets configurados

### Frontend 404 Errors

Configurar rewrite rules para SPA:

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Cloudflare Pages**: Automático
**Netlify** (`_redirects`):
```
/*    /index.html   200
```

---

## 📞 Suporte

**Problemas de Deploy**:
- Email: devops@gesthorai.com
- Slack: #deployments

**Emergências**:
- PagerDuty: +55 11 XXXX-XXXX
- On-call engineer

---

**Última Atualização**: 05 de Novembro de 2025
**Versão**: 1.0
