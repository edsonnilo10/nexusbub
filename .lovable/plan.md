

# Sincronização com Google Sheets

## Objetivo
Adicionar um botão **"Sincronizar planilha agora"** no app que puxa, da sua planilha do Google Sheets, os dados de **turmas (datas)**, **alunos matriculados**, **pagos** e **em contrato**, e mostra tudo dentro de cada curso.

## Como vai funcionar (visão do usuário)

1. Você cola o link da planilha do Google Sheets nas configurações (uma vez só).
2. Em cada curso aparece uma nova aba **"Matrículas"** com:
   - Turma (data início/fim) puxada da planilha
   - Lista de alunos com 3 selos: `Matriculado`, `Pago`, `Em contrato`
   - Contadores: ex. `12 matriculados · 9 pagos · 3 em contrato`
3. Botão **"Sincronizar agora"** no topo da aba — clica e atualiza.
4. Marca data/hora da última sincronização.

```text
┌─ Curso: Pós em US Geral ───────────────────────┐
│  [Info] [Conteúdo] [WhatsApp] [Proposta] [Matrículas●]│
├────────────────────────────────────────────────┤
│  🔄 Sincronizar agora    Última: hoje 14h32   │
│                                                │
│  Turma fev/2026 (10/02 → 10/12)                │
│  ├ 12 matriculados · 9 pagos · 3 em contrato   │
│  ├ Maria Silva       [Pago]                    │
│  ├ João Costa        [Em contrato]             │
│  └ ...                                         │
└────────────────────────────────────────────────┘
```

## Decisões importantes

**Acesso à planilha — duas opções:**
- **(A) Planilha pública para leitura** (link "qualquer pessoa com o link pode ver"): mais simples, sem credenciais, funciona em 5 minutos. Recomendo essa.
- **(B) Service Account do Google** (mantém a planilha privada, compartilha só com um e-mail técnico): mais seguro, exige eu pedir um JSON de credenciais.

Vou implementar a **(A)** por padrão e deixar a (B) como evolução se você precisar manter a planilha privada.

**Estrutura esperada da planilha** (uma aba por curso ou uma aba mestre — ambos funcionam):

| Coluna esperada | Aceita também |
|---|---|
| Curso | nome, course |
| Turma / Data início | inicio, start |
| Data fim | fim, end |
| Aluno | nome aluno, student |
| Status pagamento | pago, status, financeiro |
| Status contrato | contrato |

O parser é tolerante (igual ao do importador atual): ignora maiúsculas/acentos e tenta múltiplos nomes de coluna. Se uma aba não tiver colunas reconhecíveis, ela é ignorada.

## Arquitetura técnica

**Tabelas novas (Lovable Cloud):**
- `sheet_config` — guarda o link da planilha por usuário (1 linha por user).
- `course_enrollments` — alunos por turma:
  - `course_id`, `class_id` (opcional, faz match por data), `student_name`, `payment_status` (`pendente`/`pago`/`isento`), `contract_status` (`sem_contrato`/`em_contrato`/`assinado`), `synced_at`, `source_row` (rastreabilidade).
- RLS: cada usuário vê só suas próprias matrículas (igual ao padrão de `user_course_overrides`).

**Edge function nova: `sync-sheet`**
- Recebe a URL da planilha → converte para endpoint CSV público do Google (`/export?format=csv&gid=...`) para cada aba.
- Faz parse com a mesma lógica do `ImportCourses.tsx` (já temos `findKey`, `dt`, `num`).
- Cruza o nome do curso da linha com `courses.name` (fuzzy match, slugify).
- Faz `upsert` em `course_enrollments` por (`course_id` + `student_name` + `class_start_date`).
- Retorna resumo: `{ cursosAtualizados, alunosNovos, alunosAtualizados, abasIgnoradas }`.

**Frontend:**
- `src/pages/Settings.tsx` (nova): campo para colar link + testar conexão.
- `src/components/course/CourseEnrollmentsTab.tsx` (nova): lista alunos da turma selecionada com selos coloridos e botão de sincronizar.
- Adicionar 5ª aba em `CourseDetail.tsx`.
- Hook `useEnrollments(courseId)` para ler do banco com realtime.

## Entrega
- Migration: `sheet_config` + `course_enrollments` + RLS + enums de status.
- Edge function `sync-sheet` (sem JWT necessário porque já validamos user via header).
- Página de configurações + nova aba no curso.
- Botão de sincronizar com loading + toast de resultado.
- Indicador "Última sincronização há X minutos" em cada turma.

## Limites e observações
- Planilha precisa estar **compartilhada como "qualquer pessoa com o link pode ver"** para a opção (A).
- Sincronização é **só leitura** (planilha → app). Se editar no app, na próxima sync o valor é sobrescrito.
- Aluno é identificado por **nome** — se renomear na planilha, vira "novo aluno". (Posso adicionar coluna `id_aluno` opcional depois, se quiser.)
- O Google às vezes limita downloads frequentes; manter o uso "sob demanda" evita bloqueio.

