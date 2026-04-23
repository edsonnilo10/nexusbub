

## Plano: 5 correções no sync + UI de turmas órfãs

### 1) Edge function `supabase/functions/sync-google-sheets/index.ts`

**a) Fallback DF na `unitFromTurma`**
Mudar a chamada em `processPaidStudentsTab` (linha ~557) para usar `"brasilia"` como fallback:
```ts
const derivedUnit = unitFromTurma(classLabel, "brasilia");
```
A própria função já aceita o fallback como parâmetro — só trocar o valor passado.

**b) Preferir `courses.mnemonic` no `findCourseByTurma`**
Atualizar a função para, antes de calcular o mnemônico via slug, comparar com `course.mnemonic` (quando preenchido):
```ts
const findCourseByTurma = (courses, turma, unit) => {
  const prefix = turmaPrefix(turma); // "cmusmesq"
  if (!prefix) return undefined;
  
  // 1) match por mnemonic explícito (prioridade)
  const byMnemonic = courses.find((c) => {
    if (!c.mnemonic) return false;
    return norm(c.mnemonic).replace(/\s+/g, "") === prefix && c.unit === unit;
  });
  if (byMnemonic) return byMnemonic;
  
  // 2) fallback mnemonic em qualquer unit
  const byMnemonicAnyUnit = courses.find((c) => {
    if (!c.mnemonic) return false;
    return norm(c.mnemonic).replace(/\s+/g, "") === prefix;
  });
  if (byMnemonicAnyUnit) return byMnemonicAnyUnit;
  
  // 3) fallback antigo: slug stripped (lógica atual)
  // ...
};
```

**c) Coletor de turmas órfãs (`unmatched_turmas`)**
Criar um `Map<string, { prefix, quantidade, exemplo }>` no escopo do `processPaidStudentsTab` e `processEnrollmentsTab`. Sempre que `findCourseByTurma` retornar `undefined`, incrementar contagem. Agregar globalmente e retornar no JSON:
```ts
{
  ok: true,
  processed: { ... },
  unmatched_turmas: [
    { prefix: "cmusinme", quantidade: 191, exemplo: "CM US INME.SP.2607.1" },
    { prefix: "cmusmor1", quantidade: 50, exemplo: "CM US MOR1.2603.1" },
    ...
  ]
}
```

**d) Log de falhas de matching**
Para cada prefixo órfão (uma amostra por prefixo, não por linha), logar:
```ts
console.log(`[match-fail] turma="${turma}" prefix="${prefix}" derivedUnit="${unit}" anyCourseWithPrefix=${found ? found.slug : 'NONE'}`);
```

### 2) Migration: coluna `mnemonic` em `courses`

```sql
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS mnemonic TEXT;
COMMENT ON COLUMN public.courses.mnemonic IS 'Código curto usado na planilha antes do primeiro ponto. Ex: CM US MESQ para turmas CM US MESQ.2601.1';
```

(Sem dado obrigatório — usuário preenche pela UI conforme aprende quais cursos precisam.)

### 3) Campo `mnemonic` no `CourseEditor`

Em `src/pages/CourseEditor.tsx`, adicionar input texto opcional "Mnemônico (código da planilha)" com helper text:
> "Código usado na planilha antes do primeiro ponto. Ex: `CM US MESQ` para turmas `CM US MESQ.2601.1`. Deixe em branco para usar detecção automática pelo slug."

Salvar em `courses.mnemonic` no submit.

### 4) UI de "Turmas sem curso vinculado" em `Settings`

Em `src/pages/Settings.tsx`, ler `lastSummary.unmatched_turmas` e renderizar uma seção nova abaixo do resumo de sync:

```
┌─ Turmas sem curso vinculado (5) ────────────────┐
│ cmusinme   191 alunos   CM US INME.SP.2607.1   │
│ cmusmor1    50 alunos   CM US MOR1.2603.1      │
│ ...                                              │
└──────────────────────────────────────────────────┘
Cadastre o curso ou preencha o "Mnemônico" no editor 
do curso correspondente para resolver.
```

### 5) Re-rodar sync automaticamente

Após o deploy da edge function corrigida + migration, disparar `supabase.functions.invoke("sync-google-sheets")` automaticamente uma vez (ou instruir o usuário a clicar em "Sincronizar agora"). Isso repopula `course_id` nas linhas existentes via `onConflict` UPDATE.

---

### Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/sync-google-sheets/index.ts` | fallback DF + preferir mnemonic + coletor órfãos + logs |
| migration | `ALTER TABLE courses ADD COLUMN mnemonic TEXT` |
| `src/pages/CourseEditor.tsx` | input "Mnemônico" + persistência |
| `src/pages/Settings.tsx` | bloco "Turmas sem curso vinculado" |

### Validação

1. Após o sync, inspecionar `lastSummary.unmatched_turmas` na UI.
2. Conferir nos Edge Function Logs as linhas `[match-fail]` para cada prefixo órfão.
3. Checar SQL:
   ```sql
   SELECT count(*) FILTER (WHERE course_id IS NOT NULL) AS com_curso,
          count(*) AS total
   FROM paid_students;
   ```
4. Esperado: ~54% → ~85%+ com `course_id` preenchido só com o Passo 1.
5. Após cadastrar mnemônicos pelos órfãos top (MIFE, INME, MOR1/MOR2, etc.) → >95%.

