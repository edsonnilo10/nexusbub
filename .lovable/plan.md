

## Por que tudo aparece zerado

Os dados **estão sincronizados no banco**:
- `enrollments_by_class`: 44 linhas
- `paid_students`: 243 linhas
- `calendar_events`: 95 linhas

Mas a UI mostra 0 porque o resumo (`useCursosResumo`) agrega **por `course_id`**, e **todas** as linhas de matrículas e pagos têm `course_id = NULL`. Sem o link com `courses.id`, nada é atribuído a nenhum curso → todos zerados.

Há também um bug grosseiro no `paid_students`: `student_name` e `course_name` estão recebendo `"1.PAGO"` e datas (ex.: `08/03/2024`). Os índices de coluna estão pegando o cabeçalho errado.

### Causas precisas

| # | Onde | Problema |
|---|---|---|
| 1 | `processEnrollmentsTab` → `findCourse(courses, turmaCode, unit)` | Compara `"CM US CAVF.SP.2607.1"` com slug `"cm-us-cavf-bsb"`. Nunca casa. `course_id = NULL` em todas as 44 linhas. |
| 2 | `processPaidStudentsTab` | `findIdx(header, ["status",...])` pode estar achando uma coluna chamada "status" antes de "STATUS DO ALUNO", e o `idxName` está pegando a coluna errada (resultado: `student_name = "1.PAGO"`, `course_name = "08/03/2024"`). |
| 3 | `processPaidStudentsTab` → `findCourse(courses, courseName)` | Mesmo se `courseName` viesse certo, ele recebe a **TURMA** (ex.: `CM US CAVF.SP.2607.1`), não o nome do curso. Não casa com slug. |
| 4 | `useCursosResumo` | Só agrega quando `course_id` existe. Como todos são NULL, mostra 0. |

### Arquitetura de matching (TURMA → curso)

Padrão observado nos dados:

```text
Turma: CM US CAVF.SP.2607.1   →  prefixo: "CM US CAVF" + unidade SP
Turma: CM US CAVF.2604.1       →  prefixo: "CM US CAVF" + unidade DF (default)
Slug:  cm-us-cavf-bsb           →  prefixo normalizado: "cmuscavf" + sufixo "bsb"
Slug:  cm-us-giob-sp            →  prefixo normalizado: "cmusgiob" + sufixo "sp"
```

Regra: extrair o prefixo da TURMA até o primeiro ponto, normalizar (sem espaços/acentos/maiúsculas), e casar com o slug do curso filtrado pela unidade (`-sp` para SP, `-bsb` para DF).

### O que será feito

#### 1) `supabase/functions/sync-google-sheets/index.ts`

Adicionar duas funções utilitárias:

```ts
// "CM US CAVF.SP.2607.1" -> "cmuscavf"
const turmaPrefix = (turma: string): string => {
  const head = (turma || "").split(".")[0] || "";
  return norm(head).replace(/\s+/g, "");
};

// match por prefixo + sufixo de unidade no slug
const findCourseByTurma = (courses: Course[], turma: string, unit: "sao_paulo" | "brasilia") => {
  const prefix = turmaPrefix(turma);
  if (!prefix) return undefined;
  const suffix = unit === "brasilia" ? "bsb" : "sp";
  // 1) preferir match exato com sufixo da unidade
  const exact = courses.find((c) => {
    const slugStripped = norm(c.slug || "").replace(/-/g, "");
    return slugStripped.startsWith(prefix) && slugStripped.endsWith(suffix);
  });
  if (exact) return exact;
  // 2) fallback: qualquer curso da mesma unit cujo slug comece com o prefixo
  return courses.find((c) => {
    if (c.unit !== unit) return false;
    const slugStripped = norm(c.slug || "").replace(/-/g, "");
    return slugStripped.startsWith(prefix);
  });
};
```

**Em `processEnrollmentsTab`**: trocar `findCourse(courses, turmaCode, unit)` por `findCourseByTurma(courses, turmaCode, unit)`.

**Em `processPaidStudentsTab`**:
- Tornar a busca de cabeçalho mais estrita: `idxName` precisa ser uma coluna cujo conteúdo seja exatamente "NOME"/"ALUNO" (rejeitando "STATUS DO ALUNO"); `idxStatus` precisa preferir "STATUS DO ALUNO".
- Derivar `unit` da TURMA: se o segundo segmento depois do ponto for `SP` → SP, senão DF (alinhado com a planilha GR).
- Passar a usar `findCourseByTurma(courses, classLabel, derivedUnit)` em vez de `findCourse(courses, courseName)`.
- Logar amostra das primeiras 3 linhas processadas (`student_name`, `class_label`, `course_id`) para confirmar que parou de gravar `"1.PAGO"`.

#### 2) Limpar dados sujos antes do próximo sync

Migration única que apaga linhas claramente quebradas dos pagos (onde `student_name` ou `course_name` contém apenas `"1.PAGO"` ou bate o regex de data `dd/mm/yyyy`). Isso evita que esses 243 lixos fiquem ocupando as UNIQUE keys e atrapalhem o re-upsert:

```sql
DELETE FROM public.paid_students
WHERE student_name IN ('1.PAGO', '2.PAGO', '0.PAGO')
   OR course_name ~ '^\d{2}/\d{2}/\d{4}$';
```

Dados de `enrollments_by_class` ficam — vão ser **atualizados** pelo upsert (mesma chave) com `course_id` preenchido.

#### 3) Re-rodar o sync

Após o deploy da edge function corrigida e da migration, basta clicar **Sincronizar agora**. Como o `onConflict` já está com UNIQUE batendo, o upsert vai sobrescrever as 44 linhas existentes de enrollments preenchendo `course_id`, e vai inserir os pagos corretamente.

### O que NÃO vou mexer

- Schema das tabelas (UNIQUE constraints já estão certas).
- `useCursosResumo` (a lógica está correta — só falta `course_id` nos dados).
- Estrutura da planilha.
- Matching de abas (já está OK conforme logs).

### Resultado esperado

Depois do sync corrigido:
- `enrollments_by_class.course_id` preenchido nas 44 linhas (ou mais).
- `paid_students` com `student_name` real, `class_label` real e `course_id` preenchido.
- Tela "Cursos" deixa de mostrar tudo zerado.
- Dashboard global passa a contar matriculados/pagos por curso e por unidade.

### Validação

1. `Sincronizar agora` na UI.
2. Conferir nos logs:
   - `[processEnrollmentsTab]`: amostra mostrando `course_id` não-nulo.
   - `[processPaidStudentsTab]`: amostra mostrando nomes de alunos reais.
3. Conferir SQL:
   ```sql
   SELECT count(*) FILTER (WHERE course_id IS NOT NULL) AS com_curso,
          count(*) AS total
   FROM enrollments_by_class;
   ```
4. Conferir UI: tela "Cursos" mostra `Pagos`, `Pré`, `Total` > 0.

### Próximo passo (modo default)

| Ação | Ferramenta |
|---|---|
| Adicionar `turmaPrefix` + `findCourseByTurma` e plugar em `processEnrollmentsTab` | code--line_replace |
| Endurecer headers e usar TURMA para casar curso em `processPaidStudentsTab` | code--line_replace |
| Migration para limpar `paid_students` com lixo `"1.PAGO"`/datas | migration tool |

