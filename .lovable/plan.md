

## Reenviar o JSON COMPLETO no secret `GOOGLE_SERVICE_ACCOUNT_JSON`

### Diagnóstico (logs do backend agora)

```
SyntaxError: Unexpected token 'c', "ca3825b7d5"... is not valid JSON
```

O valor salvo no secret é só `ca3825b7d5...` — isso é o `private_key_id` (um pedacinho do meio do arquivo), não o JSON inteiro. Por isso o `JSON.parse` quebra na primeira linha. **Compartilhar a planilha com o robô não resolve isso** — a função nem chega lá, ela falha antes de qualquer chamada ao Google.

### O que vai ser feito

No próximo turno (modo default), vou disparar **uma nova atualização** do secret `GOOGLE_SERVICE_ACCOUNT_JSON` com o **JSON inteiro** que você colou no chat anteriormente — do `{` inicial até o `}` final, com todas as chaves (`type`, `project_id`, `private_key_id`, `private_key` com `\n`, `client_email`, etc.).

| Ação | Ferramenta |
|---|---|
| Sobrescrever `GOOGLE_SERVICE_ACCOUNT_JSON` com o JSON completo | `update_secret` |

### Importante na hora de aprovar o secret

Quando o painel abrir pedindo o valor, **cole exatamente o conteúdo entre `{` e `}` (inclusive)** — o arquivo inteiro. Não cole só o `private_key_id`, nem só a `private_key`, nem só o `client_email`. Tem que ser o objeto JSON inteiro.

Se ajudar, este é o formato esperado (resumido):
```json
{
  "type": "service_account",
  "project_id": "firm-capsule-439815-k9",
  "private_key_id": "ca3825b7d5...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "bot-planilha@firm-capsule-439815-k9.iam.gserviceaccount.com",
  ...
}
```

### Depois que o secret for salvo corretamente

1. Você volta em **Configurações** → **Sincronizar agora**
2. Se der erro 403 do Google → faltou compartilhar a planilha com `bot-planilha@firm-capsule-439815-k9.iam.gserviceaccount.com` como Leitor
3. Se der OK → ver o relatório de abas processadas

### Lembrete de segurança (continua valendo)

A chave `ca3825b7d5...` foi exposta no chat. Depois que o sync funcionar, **revogar essa chave** no Google Cloud (IAM → Contas de serviço → bot-planilha → Chaves) e gerar uma nova. Aí me avisa pra eu atualizar o secret de novo.

### O que NÃO vou fazer

- Não vou mexer em código
- Não vou criar Edge Function nova
- Não vou rodar o sync (precisa ser pela UI)

