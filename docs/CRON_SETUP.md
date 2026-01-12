# Configuração do Cron Job para Manutenção de Banco de Dados

## Pré-requisitos

1. **Extensões habilitadas no Supabase:**
   - `pg_cron` (para agendamento)
   - `pg_net` (para chamadas HTTP)

Para habilitar, execute no SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Configurar o Cron Job

Execute o SQL abaixo no Supabase SQL Editor, **substituindo os valores**:

```sql
-- Agendar manutenção diária às 03:00 UTC (00:00 BRT)
SELECT cron.schedule(
  'db-maintenance-daily',
  '0 3 * * *',  -- Todo dia às 03:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://xpgazdzcbtjqivbsunvh.supabase.co/functions/v1/db-maintenance',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_ANON_KEY_AQUI"}'::jsonb,
    body := concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
```

### Obter sua ANON_KEY

1. Acesse o Supabase Dashboard
2. Vá para **Settings** → **API**
3. Copie a chave `anon` (pública)
4. Substitua `SEU_ANON_KEY_AQUI` no SQL acima

## Opções de Agendamento

| Frequência | Cron Expression | Recomendação |
|------------|-----------------|--------------|
| A cada hora | `0 * * * *` | Alto volume de dados |
| Diário (3am) | `0 3 * * *` | **Recomendado** |
| 2x por dia | `0 3,15 * * *` | Volume médio-alto |
| Semanal (domingo) | `0 3 * * 0` | Baixo volume |

## Verificar Jobs Agendados

```sql
SELECT * FROM cron.job;
```

## Remover um Job

```sql
SELECT cron.unschedule('db-maintenance-daily');
```

## Verificar Execuções Recentes

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## Verificar Logs da Edge Function

1. Acesse o Supabase Dashboard
2. Vá para **Edge Functions** → **db-maintenance**
3. Clique em **Logs** para ver execuções

## Monitoramento via Audit Logs

A edge function registra cada execução na tabela `audit_logs`:

```sql
SELECT 
  id,
  action,
  new_data,
  timestamp
FROM audit_logs 
WHERE table_name = 'system' 
  AND action = 'scheduled_maintenance'
ORDER BY timestamp DESC
LIMIT 10;
```

## Troubleshooting

### Job não está executando

1. Verifique se as extensões estão habilitadas:
   ```sql
   SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
   ```

2. Verifique se o job existe:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'db-maintenance-daily';
   ```

3. Verifique erros recentes:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'db-maintenance-daily')
   ORDER BY start_time DESC 
   LIMIT 5;
   ```

### Edge function retorna erro

1. Verifique se a função está deployada:
   - Dashboard → Edge Functions → db-maintenance

2. Teste manualmente:
   ```bash
   curl -X POST \
     'https://xpgazdzcbtjqivbsunvh.supabase.co/functions/v1/db-maintenance' \
     -H 'Authorization: Bearer SEU_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"manual": true}'
   ```

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Queries de listagem | ~50ms | ~10ms |
| Estatísticas por org | Query completa | View materializada (~1ms) |
| Dados desatualizados | Sempre atuais | Max 24h (ou conforme cron) |
