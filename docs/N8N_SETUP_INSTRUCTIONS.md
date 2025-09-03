# Configuração do N8N para Follow-ups WhatsApp

## 1. Importar Workflow

1. Acesse seu N8N
2. Clique em "Import from File" ou "+" → "Import"
3. Faça upload do arquivo `N8N_WORKFLOW_EXAMPLE.json`
4. O workflow será importado com todos os nós configurados

## 2. Configurar Credenciais

### Webhook Authentication
1. Vá em **Settings** → **Credentials**
2. Criar nova credencial tipo "Header Auth"
3. Configurar:
   - **Name**: `Webhook Bearer Token`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer SEU_WEBHOOK_SHARED_TOKEN`

### WhatsApp API (Evolution/Outra)
1. Criar credencial para sua API WhatsApp
2. Configurar endpoints e tokens necessários
3. **Importante**: Substituir a simulação no código por chamadas reais à API

## 3. Configurar Webhook URL

1. No nó "Webhook Trigger", copie a URL gerada
2. A URL será algo como: `https://seu-n8n.domain.com/webhook/abc123`
3. Configurar essa URL como `N8N_FOLLOWUP_WEBHOOK_URL` no Supabase

## 4. Personalizar para sua API WhatsApp

No nó "Process Leads", substitua a simulação por código real:

```javascript
// Substituir esta parte no código:
// Simular envio WhatsApp (substitua pela implementação real)
const success = Math.random() > 0.1;

// Por algo como:
const whatsappResult = await $http.request({
  method: 'POST',
  url: 'https://sua-api-evolution.com/message/sendText/sua-instancia',
  headers: {
    'Authorization': 'Bearer SEU_TOKEN_EVOLUTION',
    'Content-Type': 'application/json'
  },
  body: {
    number: lead.whatsapp_number,
    text: message,
    delay: 1200
  }
});

const success = whatsappResult.status === 200;
const messageId = whatsappResult.data?.messageId;
```

## 5. Configurar Rate Limiting

Ajustar delays conforme necessário:

```javascript
// No código do nó "Process Leads"
const messageDelay = (persona.messageDelay || 3) * 1000; // Delay entre mensagens
const batchSize = 10; // Quantidade por lote
const batchPause = 2000; // Pausa entre lotes (ms)
```

## 6. Monitoring e Logs

O workflow já inclui logs detalhados:
- ✅ Sucessos em verde
- ❌ Erros em vermelho  
- 📦 Informações de lotes
- 📊 Estatísticas finais

Monitore via N8N executions ou configure webhook de logs.

## 7. Testes

### Teste Inicial
1. No app, criar um Follow-up Run
2. Usar filtros que retornem poucos leads (ex: 2-3)
3. Verificar logs no N8N
4. Confirmar callbacks no Supabase

### Teste de Falha
1. Configurar leads com números inválidos
2. Verificar se erros são tratados corretamente
3. Confirmar status "failed" nos itens

### Teste de Volume
1. Processar 50+ leads
2. Verificar rate limiting
3. Monitorar performance

## 8. Segurança

- ✅ Token de autenticação no webhook
- ✅ Validação de payload obrigatório  
- ✅ Tratamento de erros
- ⚠️ **Importante**: Configurar timeouts adequados
- ⚠️ **Importante**: Limitar taxa de envio para não ser bloqueado pelo WhatsApp

## 9. Troubleshooting

### Workflow não recebe dados
- Verificar URL do webhook no Supabase
- Confirmar token de autenticação
- Testar webhook manualmente

### Mensagens não são enviadas
- Verificar credenciais da API WhatsApp
- Confirmar formato dos números
- Verificar rate limits

### Callbacks não chegam no app
- Verificar URL de callback
- Confirmar token no cabeçalho
- Testar webhook de status manualmente

### Performance ruim
- Reduzir `batchSize`
- Aumentar `messageDelay`
- Implementar paralelização

## 10. Evoluções Futuras

- **Personalização por lead**: Usar IA para gerar mensagens únicas
- **Agendamento**: Enviar em horários específicos
- **Retry logic**: Retentar falhas automaticamente
- **Analytics**: Métricas detalhadas de entrega
- **Templates dinâmicos**: Múltiplas versões por campanha