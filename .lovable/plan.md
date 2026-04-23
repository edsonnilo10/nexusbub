

## Corrigir matching de abas no `sync-google-sheets`

### Diagnóstico

O log do último sync mostra que a planilha **tem todas as 5 abas certas**:
- `(GR)BASE(PREENCHER AQUI)` ✓
- `(DF)TURMAS COM MATRICULADOS e PRÉ 2026` ✓
- `(SP)TURMAS COM MATRICULADOS e PRÉ 2026` ✓
- `(DF)CALENDARIO 2026` ✓
- `(SP)CALENDARIO 2026 SP` ✓

Mas:
- **Brasília** e **São Paulo** estão sendo casadas com `(DF)CONTROLE GERAL - BRASILIA(NÃO MEXER)` e `(SP)CONTROLE GERAL SÃO PAULO(NÃO MEXER)` (abas erradas, sem as colunas esperadas → "1 erro").
- **GR base, Calendário SP, Calendário DF**: aparecem como `missing_tabs` mesmo existindo na planilha.

Causa: a função `matchTab` faz duas passadas — exato e depois `includes` em qualquer direção. Quando o pass exato falha (provavelmente por espaço duplo ou caractere invisível dentro do título real), o fallback `includes` pega qualquer aba que contenha um pedaço pequeno de algum alias. Aliases curtos como `"turmas df 2026"` casam com várias abas erradas.

E o erro do toast "Falha ao chamar a sincronização" pode ser apenas reflexo visual do `1 erro(s)` — a função não está crashando.

### Mudanças (1 arquivo só)

**`supabase/functions/sync-google-sheets/index.ts`**

1. **Reescrever `matchTab`** para ser mais robusto e mais estrito:
   - Normalizar agora também colapsa espaços múltiplos, remove zero-width chars (`\u200b`, `\u200c`, `\ufeff`), e mantém o `lower + strip diacritics + trim` atual.
   - **Pass 1**: igualdade exata após normalização (mantém).
   - **Pass 2**: igualdade após remover **toda pontuação e espaços** (cobre `(DF)CALENDARIO 2026` vs `dfcalendario2026`, espaço duplo, etc).
   - **Pass 3 (fallback restrito)**: `title.startsWith(alias)` OU `alias.startsWith(title)`, exigindo overlap mínimo de 12 caracteres na versão sem pontuação. Isso evita que `"turmas df 2026"` case com `"controle geral df ..."`.
   - Sem mais `includes` em qualquer direção sem restrição de tamanho.

2. **Limpar aliases redundantes** que viraram fonte de falso-positivo: tirar os curtinhos (`"turmas df 2026"`, `"matriculados df 2026"`, `"calendario df 2026"`, etc.) e manter só os nomes reais + 1-2 variações de acento. Os 5 nomes exatos da planilha são:
   - `(GR)BASE(PREENCHER AQUI)`
   - `(DF)TURMAS COM MATRICULADOS e PRÉ 2026`
   - `(SP)TURMAS COM MATRICULADOS e PRÉ 2026`
   - `(DF)CALENDARIO 2026`
   - `(SP)CALENDARIO 2026 SP`

3. **Logar** os `tabs_found` normalizados e as tentativas de match no console pra facilitar debug futuro (vai pro Edge Function Logs, não pro UI).

### O que NÃO vou fazer

- Não vou mexer nos handlers (`processCalendarTab`, `processEnrollmentsTab`, `processPaidStudentsTab`) — eles vão funcionar assim que o match certo chegar até eles.
- Não vou mexer no Settings.tsx nem no toast — o "Erro ao sincronizar" some sozinho quando `processed` parar de ter erros.
- Não vou mexer em secret nem em planilha (já estão OK).

### Riscos

| Risco | Mitigação |
|---|---|
| Match novo ainda não pegar alguma das 5 abas | Pass 2 (sem pontuação) é bem permissivo pra acentos/espaços; se ainda assim falhar, o log no console mostra exatamente o título recebido |
| Algum dos handlers falhar com erro real (não de header) | Vai aparecer em `processed[key].errors` como antes — não silencia erros legítimos |

### Próximo passo (modo default)

| Ação | Ferramenta |
|---|---|
| Reescrever `matchTab` + ajustar `targets` em `supabase/functions/sync-google-sheets/index.ts` | code--line_replace |

Depois você roda **Sincronizar agora** e me manda o resultado.

