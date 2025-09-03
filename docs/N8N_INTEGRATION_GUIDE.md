# Guia de Integração N8N - Contratos de API

Este documento define os contratos de comunicação entre o app e o workflow n8n para envio de mensagens WhatsApp.

## Fluxo Principal

```
App → n8n-followup-dispatch → N8N Webhook → Processamento → webhook-followup-status → App
```

## 1. App → N8N (via n8n-followup-dispatch)

### Endpoint
`POST /functions/v1/n8n-followup-dispatch`

### Payload de Entrada
```json
{
  "runId": "uuid",
  "templateId": "uuid", 
  "filters": {
    "niche": "string (opcional)",
    "city": "string (opcional)", 
    "status": "string (opcional)",
    "minScore": "number (opcional)",
    "maxDaysOld": "number (opcional)",
    "excludeContacted": "boolean (opcional)"
  },
  "personaConfig": {
    "name": "string",
    "systemPrompt": "string", 
    "useJinaAI": "boolean",
    "messageDelay": "number (segundos)"
  }
}
```

### Payload Enviado ao N8N
```json
{
  "runId": "uuid",
  "runName": "string",
  "template": {
    "id": "uuid",
    "name": "string", 
    "message": "string com {{variáveis}}",
    "variables": ["array", "de", "variáveis"]
  },
  "persona": {
    "name": "string",
    "systemPrompt": "string",
    "useJinaAI": "boolean", 
    "messageDelay": "number"
  },
  "leads": [
    {
      "id": "uuid",
      "name": "string",
      "business": "string", 
      "phone": "string",
      "city": "string",
      "niche": "string",
      "score": "number",
      "whatsapp_number": "string (formatado)"
    }
  ],
  "webhookCallbackUrl": "https://xpgazdzcbtjqivbsunvh.supabase.co/functions/v1/webhook-followup-status",
  "webhookToken": "bearer_token",
  "metadata": {
    "dispatchedAt": "ISO_string",
    "totalLeads": "number",
    "filters": "objeto_filtros_original"
  }
}
```

## 2. N8N → App (via webhook-followup-status)

### Endpoint  
`POST /functions/v1/webhook-followup-status`

### Headers Obrigatórios
```
Authorization: Bearer <WEBHOOK_SHARED_TOKEN>
Content-Type: application/json
```

### Callbacks do N8N

#### Callback de Progresso (Processamento)
```json
{
  "runId": "uuid",
  "status": "processing",
  "results": [
    {
      "leadId": "uuid",
      "status": "sent" | "failed",
      "message": "texto_da_mensagem_enviada",
      "errorMessage": "motivo_da_falha (se failed)",
      "sentAt": "ISO_timestamp"
    }
  ]
}
```

#### Callback de Conclusão 
```json
{
  "runId": "uuid", 
  "status": "completed",
  "totalSent": "number",
  "totalFailed": "number"
}
```

#### Callback de Falha Global
```json
{
  "runId": "uuid",
  "status": "failed", 
  "error": "motivo_da_falha_geral"
}
```

## 3. Workflow N8N Recomendado

### Estrutura do Workflow

1. **Webhook Trigger**
   - URL: `https://app.n8n.io/webhook/seu-webhook-id`
   - Método: POST
   - Autenticação: Bearer Token

2. **Processamento por Lead**
   - Loop pelos `leads` no payload
   - Para cada lead, gerar mensagem interpolando `template.message` com dados do lead
   - Rate limiting conforme `persona.messageDelay`

3. **Envio WhatsApp**
   - Usar Evolution API ou WhatsApp Business API
   - Capturar messageId retornado
   - Tratar erros de envio

4. **Callback Progressivo**
   - Para cada mensagem enviada/falha, fazer POST para `webhookCallbackUrl`
   - Status: "processing" com array de resultados

5. **Callback Final**
   - Status: "completed" com totalizadores
   - Ou status: "failed" se erro geral

### Exemplo de Código n8n (JavaScript)

```javascript
// Exemplo de processamento em n8n
const { runId, leads, template, persona, webhookCallbackUrl, webhookToken } = $json;

// Processa cada lead
for (const lead of leads) {
  try {
    // Interpola variáveis no template
    let message = template.message;
    message = message.replace('{{name}}', lead.name);
    message = message.replace('{{business}}', lead.business);
    message = message.replace('{{city}}', lead.city);
    
    // Envia WhatsApp (substitua pela sua implementação)
    const result = await sendWhatsApp(lead.whatsapp_number, message);
    
    // Callback de progresso
    await $http.request({
      method: 'POST',
      url: webhookCallbackUrl,
      headers: {
        'Authorization': `Bearer ${webhookToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        runId,
        status: 'processing',
        results: [{
          leadId: lead.id,
          status: result.success ? 'sent' : 'failed',
          message: message,
          errorMessage: result.error,
          sentAt: new Date().toISOString()
        }]
      }
    });
    
    // Delay entre mensagens
    await new Promise(resolve => setTimeout(resolve, persona.messageDelay * 1000));
    
  } catch (error) {
    console.error(`Erro processando lead ${lead.id}:`, error);
  }
}

// Callback final
await $http.request({
  method: 'POST', 
  url: webhookCallbackUrl,
  headers: {
    'Authorization': `Bearer ${webhookToken}`,
    'Content-Type': 'application/json'
  },
  body: {
    runId,
    status: 'completed',
    totalSent: sentCount,
    totalFailed: failedCount
  }
});
```

## 4. Tabelas Afetadas

### followup_runs
- `status`: 'preparing' → 'sending' → 'completed'/'failed'
- `started_at`: preenchido quando inicia envio
- `completed_at`: preenchido quando conclui
- `total_leads`: total de leads filtrados
- `sent_count`: total enviado com sucesso  
- `failed_count`: total com falha

### followup_run_items
- Um registro por lead/mensagem
- `status`: 'pending' → 'sent'/'failed'
- `message`: texto final enviado
- `error_message`: motivo da falha (se houver)
- `sent_at`: timestamp do envio

### communications 
- Registro criado para cada mensagem enviada (`status: 'sent'`)
- `type`: 'followup'
- `channel`: 'whatsapp'
- `metadata`: inclui runId e origem n8n

### leads
- `last_contacted_at`: atualizado para mensagens enviadas

## 5. Monitoramento e Logs

### Logs no Edge Function dispatch
```
=== N8N FOLLOWUP DISPATCH STARTED ===
✅ Retrieved followup run: {id, name, status, userId}
✅ Retrieved template: {id, name, variablesCount}  
✅ Found X leads matching filters: {filtros}
✅ Updated run status to "sending"
🚀 Sending payload to n8n webhook
✅ N8N webhook success: {status, workflowId, executionId}
=== N8N FOLLOWUP DISPATCH COMPLETED ===
```

### Logs no Webhook Status
```  
Received webhook from n8n: {payload}
Processing X individual results
Successfully processed webhook for run {runId}
```

### N8N Logs Recomendados
```
Received followup dispatch: runId={id}, leads={count}
Processing lead {leadId}: {name} - {business}  
WhatsApp sent to {phone}: messageId={id}
Callback sent: {leadId} - {status}
Workflow completed: {totalSent} sent, {totalFailed} failed
```

## 6. Tratamento de Erros

### Erros Comuns
- **Template não encontrado**: 400 com mensagem específica
- **Leads não encontrados**: Processa com array vazio 
- **Falha na autenticação n8n**: 401/403
- **Timeout n8n**: 504 - reprocessar
- **Webhook callback falha**: Log erro mas não aborta

### Idempotência
- `followup_run_items` usa upsert com `(run_id, lead_id)`
- Múltiplos callbacks para mesmo lead sobrescrevem resultado anterior
- Status "completed" é final - ignora callbacks posteriores

## 7. Testes

### Cenários de Teste
1. **Fluxo completo**: Criar run → dispatch → n8n processa → callbacks → status final
2. **Falha parcial**: Alguns leads falham, outros são enviados
3. **Falha total**: N8n retorna erro geral
4. **Timeout**: N8n não responde - verificar status permanece "sending"
5. **Callback duplicado**: Mesmo leadId reportado 2x - último prevalece