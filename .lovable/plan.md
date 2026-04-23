

## Adicionar UNIQUE constraints para o ON CONFLICT do sync funcionar

### Diagnóstico

Os logs mostram exatamente o erro do Postgres:

```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

A edge function chama `upsert(..., { onConflict: "..." })` em 3 tabelas, mas no banco essas tabelas só têm a PK em `id`. Sem um UNIQUE/PK que case com as colunas do `onConflict`, o `upsert` falha 100%.

Mapeamento `tabela → colunas usadas no onConflict`:

| Tabela | Colunas no `onConflict` |
|---|---|
| `paid_students` | `user_id, student_name, course_name, class_label` |
| `calendar_events` | `user_id, unit, course_name, event_label, start_date` |
| `enrollments_by_class` | `user_id, unit, course_name, class_label, class_start_date` |

Hoje no banco existe apenas `*_pkey` em `id` nas 3 tabelas. Nenhuma UNIQUE.

### O que será feito

#### 1) Migration única com 3 UNIQUE constraints

Nova migration em `supabase/migrations/`:

```sql
-- paid_students
ALTER TABLE public.paid_students
  ADD CONSTRAINT paid_students_sync_unique
  UNIQUE (user_id, student_name, course_name, class_label);

-- calendar_events
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_sync_unique
  UNIQUE (user_id, unit, course_name, event_label, start_date);

-- enrollments_by_class
ALTER TABLE public.enrollments_by_class
  ADD CONSTRAINT enrollments_by_class_sync_unique
  UNIQUE (user_id, unit, course_name, class_label, class_start_date);
```

Observações importantes:
- As constraints batem **exatamente** com o `onConflict` da edge function — nenhuma mudança de código necessária.
- Não vou tocar em `id` (PK fica como está).
- Não vou apagar dados nem mudar tipos.

#### 2) Limpeza de duplicatas pré-existentes (se houver)

Antes de adicionar a UNIQUE, a migration vai deduplicar registros que conflitariam com a nova chave, mantendo o mais recente (`synced_at DESC`, depois `id`):

```sql
DELETE FROM public.paid_students a
USING public.paid_students b
WHERE a.id < b.id
  AND a.user_id IS NOT DISTINCT FROM b.user_id
  AND a.student_name IS NOT DISTINCT FROM b.student_name
  AND a.course_name IS NOT DISTINCT FROM b.course_name
  AND a.class_label IS NOT DISTINCT FROM b.class_label;
```

(Mesma lógica para as outras 2 tabelas, com as colunas correspondentes.)

Isso é necessário porque, sem isso, o `ADD CONSTRAINT` quebra se já houver linhas duplicadas pelas novas chaves.

### O que NÃO vou mexer

- Edge function `sync-google-sheets/index.ts` — o `onConflict` já está correto.
- Esquema das colunas — nenhuma coluna nova, nenhuma mudança de tipo.
- RLS policies — continuam iguais.
- `enrollments_by_class` em termos de comportamento — só ganha a UNIQUE que já era esperada pelo upsert.

### Resultado esperado

Depois da migration:
- `Sincronizar agora` deve concluir sem `ON CONFLICT` errors.
- `paid_students`, `calendar_events`, `enrollments_by_class` passam a ter contagens > 0 no resumo.
- `last_sync_summary` finalmente atualiza com horário novo.
- Erros das abas `CONTROLE GERAL` continuam ausentes (matching já está OK).

### Risco e mitigação

| Risco | Mitigação |
|---|---|
| Dados existentes têm duplicatas pelas novas chaves | DELETE de deduplicação roda **antes** do ADD CONSTRAINT na mesma migration |
| Linhas com `class_label = NULL` causariam múltiplos NULLs (UNIQUE permite múltiplos NULLs no Postgres) | Aceitável — re-sync sobrescreve esses casos por outra chave de inserção; se virar problema real depois, ajustamos para `NULLS NOT DISTINCT` |

### Validação após migration

1. Abrir **Configurações → Sincronizar agora**.
2. Conferir no resumo:
   - `GR base`: contagem de registros > 0, sem erro.
   - `Calendário DF` e `Calendário SP`: contagem > 0, sem erro.
   - `Brasília` e `São Paulo`: contagem > 0.
3. Conferir nos Edge Function Logs: nenhum `ON CONFLICT` error.

### Próximo passo (modo default)

| Ação | Ferramenta |
|---|---|
| Criar migration com DELETE de duplicatas + 3 UNIQUE constraints | migration tool |

