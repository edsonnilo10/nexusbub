

## Reativar o sync com o robô `bot-planilha`

### Diagnóstico

O JSON que você colou está **válido e completo**, mas o secret `GOOGLE_SERVICE_ACCOUNT_JSON` no backend está corrompido (erro `Unexpected number in JSON at position 1`). Precisamos sobrescrever o secret com o JSON correto.

### Passos (ordem obrigatória)

**1. Atualizar o secret `GOOGLE_SERVICE_ACCOUNT_JSON`**
- Vou disparar o pedido de atualização do secret usando exatamente o JSON que você enviou (do `{` até o `}`, intacto, com `\n` na `private_key`).
- Você só precisa confirmar a atualização quando o painel pedir.

**2. Você compartilha a NOVA planilha com o robô**
- Abrir a nova planilha → **Compartilhar**
- Colar: `bot-planilha@firm-capsule-439815-k9.iam.gserviceaccount.com`
- Permissão: **Leitor**
- Desmarcar "Notificar pessoas" → **Compartilhar**

**3. Você atualiza a URL no Hub**
- Menu → **Configurações**
- Cola o link novo no campo **URL da planilha** → **Salvar**

**4. Roda o sync**
- Mesmo card → **Sincronizar agora**
- Conferir o relatório (abas processadas, registros, erros)

**5. Conferência nas telas**
- **Cursos (Planilha)** → vagas/pagos/pré
- **Turmas** → janelas criadas
- **Dashboard** → totais

**6. Segurança (obrigatório no fim)**
- No Google Cloud Console, **revogar a chave** `ca3825b7d53b73b9765ce1006ad2db74f27a0eef` da Service Account `bot-planilha`
- Gerar uma nova chave JSON
- Me avisar para eu atualizar o secret de novo com a chave nova
- Motivo: a chave atual ficou exposta no histórico do chat

### O que vou fazer no próximo turno (modo default)

| Ação | Ferramenta |
|---|---|
| Atualizar `GOOGLE_SERVICE_ACCOUNT_JSON` com o JSON correto | `update_secret` |

### O que NÃO vou fazer

- Não vou tocar em código (a função `sync-google-sheets` já está pronta)
- Não vou criar Edge Function nova
- Não vou modificar a estrutura da planilha
- Não vou rodar o sync por você (precisa ser feito pela UI depois que você compartilhar a planilha com o robô)

### Riscos

| Risco | Mitigação |
|---|---|
| Esquecer de compartilhar a planilha com o robô → erro 403 | Passo 2 cobre |
| Chave exposta no chat | Passo 6 (rotação obrigatória) |
| Nomes de curso diferentes na nova planilha → cria duplicatas | Reviso depois com você |

