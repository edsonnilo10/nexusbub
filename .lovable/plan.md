

## Corrigir Combo GIOB + TRVG (SP e BSB) com tabs internas

### Diagnóstico

| Item | SP | BSB |
|---|---|---|
| Curso combo existe | ✅ `3c9255c5...` | ✅ `ec830730...` |
| Combo tem turmas vinculadas | ❌ nenhuma | ❌ nenhuma |
| Combo tem módulos cadastrados | ❌ 0 | ❌ 0 |
| GIOB individual existe | ❌ NÃO existe | ✅ `2163b377...` (20 módulos) |
| TRVG individual existe | ✅ `4d13307f...` (5 módulos) | ✅ `f493a113...` (5 módulos) |
| Turmas conjuntas GIOB+TRVG | ❌ TRVG tem 3 turmas próprias, GIOB não existe | ✅ 4 grupos (3 próximos + 1 encerrado) |

### Plano de execução

#### 1. Dados (data fix via INSERT)

**a) Criar curso GIOB SP individual**
- Espelhar o BSB: nome "CM US GIOB SP: Básico de Ultrassonografia em Ginecologia e Obstetrícia", slug `cm-us-giob-sp`, unit `sao_paulo`, workload 60h, mesma descrição/coordenação
- Copiar os 20 módulos do GIOB BSB para o novo GIOB SP

**b) Vincular GIOB SP nas mesmas 3 turmas que o TRVG SP já tem**
- Grupos `ff577684` (17–25/jul), `84b4bbf6` (18–26/set), `655bce78` (04–12/dez) de 2026
- Inserir 3 linhas em `class_group_courses` (course_id = novo GIOB SP, display_mode `individual`)

**c) Vincular o COMBO SP nas mesmas 3 janelas**
- 3 inserts em `class_group_courses` (course_id = combo SP `3c9255c5`, display_mode `combo_only`)

**d) Vincular o COMBO BSB nas 4 janelas existentes do GIOB+TRVG BSB**
- Grupos `3c5b3d28` (20–28/fev — encerrada), `47b6d27b` (15–23/mai), `316cd52a` (14–22/ago), `fd2bfa1f` (13–21/nov)
- 4 inserts em `class_group_courses` (course_id = combo BSB `ec830730`, display_mode `combo_only`)

**e) Copiar módulos para os 2 combos**
- Combo SP `3c9255c5`: 20 módulos do GIOB BSB + 5 do TRVG BSB (25 inserts em `course_modules`, com `order_index` 0–24)
- Combo BSB `ec830730`: mesma cópia (25 inserts)
- Marcar visualmente as seções via `description` do módulo (ex.: "[GIOB] …", "[TRVG] …") para facilitar identificação na tab

**f) (Opcional) Atualizar `display_mode` dos vínculos individuais para `both`**
- Hoje GIOB BSB e TRVG BSB estão como `individual` → ficam fora do combo. Mantenho como está; a regra automática (item 3) cuida disso quando você decidir.

#### 2. UI — Tabs internas no CourseDetail dos combos

Em `src/pages/CourseDetail.tsx` (ou no componente `CourseInfoTab` / `CourseLandingTab` — vou verificar qual é o ponto certo durante a implementação):

- Detectar se o curso atual é um combo (heurística: `name` contém " + " ou existe regra ativa em `course_combo_rules` apontando esse curso como `combo_course_id`)
- Quando combo, renderizar componente `<ComboTabs />` com 3 abas usando `Tabs` do shadcn:
  - **Tab "Combo completo"**: módulos completos + datas do combo (turmas vinculadas)
  - **Tab "Só GIOB"**: módulos e datas do GIOB individual (mesma unidade)
  - **Tab "Só TRVG"**: módulos e datas do TRVG individual (mesma unidade)
- Para SP, a tab "Só GIOB" agora terá conteúdo (curso recém-criado)
- Resolver o GIOB/TRVG individual procurando em `courses` por `slug` LIKE `cm-us-giob-{sp,bsb}` e `cm-us-trvg-{sp,bsb}` ou por mapeamento explícito

#### 3. Regra automática (pendente — você não respondeu)

Vou criar com padrão recomendado: combo `combo_only`, individuais `both`. Isso significa que GIOB e TRVG continuam visíveis sozinhos, e o combo só aparece quando os dois coincidem na mesma janela. Se preferir outro modo, me avise antes de eu rodar.

- Insert em `course_combo_rules`: 1 linha SP (combo `3c9255c5`, triggers [novo GIOB SP, `4d13307f`]) e 1 linha BSB (combo `ec830730`, triggers [`2163b377`, `f493a113`])

### Arquivos / operações

| Tipo | Alvo |
|---|---|
| INSERT | `courses` (1 linha — GIOB SP) |
| INSERT | `course_modules` (20 + 25 + 25 = 70 linhas) |
| INSERT | `class_group_courses` (3 + 3 + 4 = 10 linhas) |
| INSERT | `course_combo_rules` (2 linhas) |
| Editar | `src/pages/CourseDetail.tsx` (renderizar tabs quando combo) |
| Criar | `src/components/course/ComboTabs.tsx` (componente novo com as 3 abas) |
| Helper | `src/lib/courseHelpers.ts` (função `isComboCourse` + `findComboComponents`) |

### O que NÃO será feito

- Sem migrations de schema (a estrutura já comporta tudo)
- Sem tocar em `client.ts` / `types.ts`
- Sem mexer em RLS
- Sem alterar `course_classes` legado (vamos só usar `class_groups`)
- Sem criar página/rota nova — as tabs ficam dentro do CourseDetail existente

### Notas técnicas

- Os INSERTs em `class_group_courses` precisam respeitar o `user_id` do dono do registro? Não — a tabela não tem coluna `user_id`, RLS só checa `is_approved`. Como inserts via tool de migração rodam como `service_role`, passa direto.
- Os INSERTs em `course_modules` também não exigem `user_id`.
- O novo curso GIOB SP fica sem `created_by` (campo nullable) — sem problema.
- A descrição programática que já existe nos combos será mantida; os módulos são adicionais.

