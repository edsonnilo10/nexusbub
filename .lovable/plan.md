

## Diagnóstico — dois problemas separados

### Problema 1: "Failed to send a request to the Edge Function" na aba Matrículas do curso

Acontece quando clico em **Sincronizar agora** dentro de um curso (não em Configurações). Os logs da edge function mostram que a sincronização **funciona normalmente** quando chamada de Configurações — então a falha é no lado do client.

**Causa raiz:** Em `CourseEnrollmentsTab.tsx`, a `handleSync` espera resposta no formato `{ alunosNovos, alunosAtualizados }`, mas a edge function retorna `{ ok, processed, unmatched_turmas, ... }`. Mais importante: provavelmente o invoke está falhando por **timeout do client** (a edge demora ~14s lendo 6.101 linhas + 1.014 + calendários — o `supabase.functions.invoke` do browser pode estar cortando antes).

### Problema 2: Contagens infladas — "60 pagos no MIFE" mas só deveria ter alguns

Confirmado nos números: a tela mostra **419 pagos totais**, mas o card mostra **60 no MIFE**. Olhando o banco:

- `paid_students` tem **TODAS** as linhas históricas (2023, 2024, 2025, 2026) marcadas como "1.PAGO".
- Logs mostram amostras de 2023 sendo processadas: `turma="CM US PED2.2305.1"` (ano 23, mês 05).
- Não há filtro por ano de turma — então o curso `cm-pr-mife-bsb` está somando alunos de **todas as edições históricas** dele, não só 2026.

A planilha `(GR)BASE(PREENCHER AQUI)` é o histórico completo da Cetrus desde 2021. Está correto importar tudo (rastreabilidade), mas o **resumo dos cursos (`useCursosResumo`) tem que filtrar por ano da turma atual**, senão soma 5 anos de alunos no card de 2026.

---

## Plano de correção

### 1) Corrigir botão "Sincronizar agora" dentro do curso

Em `src/components/course/CourseEnrollmentsTab.tsx`:

- Trocar a leitura `data.alunosNovos / data.alunosAtualizados` (que não existem) pelo formato real retornado pela função (`processed.paid_students.inserted` etc.).
- Aumentar tolerância do invoke: a edge demora ~15s. O `supabase-js` invoke usa fetch padrão sem timeout configurável, mas o erro "Failed to send a request" geralmente é o browser/CORS abortando. Vou:
  - Adicionar headers explícitos no invoke (`headers: { "Content-Type": "application/json" }`).
  - Logar o erro completo (`console.error(error)`) para diagnóstico se persistir.
  - Mostrar toast com a mensagem real do erro em vez de mensagem genérica.

### 2) Filtrar matrículas/pagos por ano da turma no resumo

Em `src/hooks/useCursosResumo.tsx` (e/ou onde o resumo agrega):

- Adicionar lógica para extrair o **ano de início da turma** do `class_label` (formato `CM PR MIFE.2606.1` → ano `2026`, mês `06`).
- Filtrar para contar apenas turmas do **ano corrente** (ou um filtro selecionável: 2024 / 2025 / 2026).
- Aplicar o mesmo em `paid_students`: contar apenas pagos vinculados a turmas de 2026.

Adicionar utilitário em `src/lib/turmaUtils.ts`:
```ts
// "CM PR MIFE.2606.1" -> { year: 2026, month: 6, num: 1 }
// "CM US INME.SP.2607.1" -> { unit: "sp", year: 2026, month: 7, num: 1 }
export const parseTurmaCode = (turma: string): { year?: number; month?: number; unit?: string; num?: number };
```

### 3) Adicionar filtro de ano na UI de Cursos

Em `src/pages/CursosPlanilha.tsx`, adicionar um seletor "Ano" (default 2026) ao lado dos filtros de unidade. O hook `useCursosResumo` recebe esse ano e filtra as agregações.

### 4) (Opcional) Tela de "Códigos de Curso" para cadastrar mnemônicos em massa

Se você quiser me enviar a lista de códigos com nomes, posso criar uma tela em **Configurações → Códigos de curso** para você colar uma lista do tipo:
```
CM US MOR1 = cm-us-morf1-bsb
CM US INME = cm-us-inme-bsb
PG US MEFE = pg-us-mefe-bsb
...
```
e ela atualiza `courses.mnemonic` em massa. Resolveria de uma vez os 24 prefixos órfãos atuais.

---

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `src/components/course/CourseEnrollmentsTab.tsx` | Corrigir handler do toast + log do erro real |
| `src/lib/turmaUtils.ts` (novo) | Parser de código de turma → ano/mês/unit |
| `src/hooks/useCursosResumo.tsx` | Filtrar por ano da turma |
| `src/pages/CursosPlanilha.tsx` | Seletor de ano no header |

---

## Validação

1. Recarregar a aba Matrículas dentro do curso e clicar **Sincronizar agora** — deve mostrar resultado real ou erro detalhado.
2. Em **Cursos (Planilha)** com filtro **2026**, MIFE não deve mais mostrar 60 — deve mostrar só os pagos de turmas `CM PR MIFE.26xx.x`.
3. Trocar filtro para **2025** mostra os pagos antigos.

---

## Pergunta

Você quer que eu **já inclua** o seletor de ano (Passo 3) ou prefere começar só com o **filtro automático em 2026** (mais simples) e adicionamos seletor depois? Eu recomendo começar com filtro fixo em 2026 e iterar.

Também: quer que eu prepare a tela de **cadastro em massa de mnemônicos** (Passo 4) já agora, ou você vai preencher um a um pelo editor de curso?

