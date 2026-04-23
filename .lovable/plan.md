
## Fazer o sync parar de estourar no meio e parar de mostrar relatório velho

### Diagnóstico

O problema agora não parece mais ser o matching das abas.

Os logs mais recentes do backend mostram que:
- a função já está vendo as abas corretas;
- o novo `matchTab` já encontrou corretamente `"(GR)BASE(PREENCHER AQUI)"`;
- o print da tela ainda mostra o relatório antigo das 16:41, ou seja: o sync novo falha **antes de salvar um novo `last_sync_summary`**.

Isso indica que o erro atual acontece **durante o processamento**, não na descoberta das abas. O ponto mais provável é timeout/cancelamento da função, porque o código ainda faz muitos `upsert`s linha por linha, principalmente na aba **GR base**.

### O que será implementado

#### 1) Otimizar a função `sync-google-sheets` para processar em lote
Arquivo:
- `supabase/functions/sync-google-sheets/index.ts`

Mudanças:
- trocar os `upsert`s por linha por `upsert`s em lote, em chunks;
- aplicar isso nos 3 processadores:
  - `processPaidStudentsTab`
  - `processEnrollmentsTab`
  - `processCalendarTab`
- manter os mesmos dados e chaves de conflito, mas reduzir drasticamente o número de round-trips ao banco.

Objetivo:
- evitar timeout no meio da execução;
- permitir que a função chegue ao fim e grave o resumo novo.

#### 2) Adicionar logs de progresso por aba
No mesmo arquivo:
- logar início e fim de cada target;
- logar quantidade de linhas lidas;
- logar quantos registros foram preparados e quantos foram persistidos por lote.

Objetivo:
- identificar exatamente onde a execução para, se ainda houver falha;
- diferenciar “aba ignorada”, “aba vazia”, “erro de colunas” e “timeout”.

#### 3) Manter o filtro estrito só para as 5 abas esperadas
No mesmo arquivo:
- preservar a lógica atual de ignorar qualquer aba fora desta lista:
  - `(GR)BASE(PREENCHER AQUI)`
  - `(DF)CALENDARIO 2026`
  - `(SP)CALENDARIO 2026 SP`
  - `(DF)TURMAS COM MATRICULADOS E PRÉ 2026`
  - `(SP)TURMAS COM MATRICULADOS E PRÉ 2026`

Objetivo:
- garantir que abas como `CONTROLE GERAL` continuem 100% fora do processamento.

#### 4) Melhorar a mensagem de erro no frontend
Arquivo:
- `src/pages/Settings.tsx`

Mudanças:
- parar de mostrar só `Falha ao chamar a sincronização. Tente novamente.`;
- exibir `error.message` quando existir;
- diferenciar erro do backend de erro retornado no payload.

Objetivo:
- quando der problema, você ver o motivo real em vez de um toast genérico.

#### 5) Evitar confusão com resumo antigo na tela
Arquivo:
- `src/pages/Settings.tsx`

Mudanças:
- indicar que o bloco exibido é o “último resumo salvo”;
- se a chamada atual falhar, manter isso explícito para não parecer que aquele relatório acabou de ser gerado.

Objetivo:
- evitar leitura enganosa de erros antigos como se fossem do sync atual.

### Resultado esperado

Depois da implementação:
- o sync deve completar sem travar na aba `GR base`;
- o resumo salvo deve ser atualizado com a execução mais recente;
- as abas `CONTROLE GERAL` continuam ignoradas;
- se ainda houver erro real, ele aparecerá com mensagem útil.

### Arquivos que serão alterados

- `supabase/functions/sync-google-sheets/index.ts`
- `src/pages/Settings.tsx`

### Detalhes técnicos

```text
Hoje:
GR base -> milhares de upserts individuais -> função pode morrer antes do fim

Depois:
GR base -> monta array de registros -> envia em chunks (ex. 200/500 por vez) -> termina dentro do tempo
```

- O matching estrito das 5 abas será mantido.
- O foco da correção muda de “descobrir a aba certa” para “processar sem timeout”.
- Não será criada nova função backend.
- Não será alterada a estrutura da planilha.

### Validação após implementar

1. Rodar `Sincronizar agora`
2. Confirmar nos logs:
   - início e fim de cada uma das 5 abas
   - nenhum travamento após `GR base`
3. Confirmar na UI:
   - novo horário em `Última sincronização`
   - sem toast genérico
   - sem erros das abas `CONTROLE GERAL`
