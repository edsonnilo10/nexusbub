# Nexus Hub

Hub interno da Nexus Ultrassonografia para gestão de cursos de pós-graduação e modulares, matrículas, turmas, mensagens de WhatsApp e copiloto de vendas com IA.

Construído no [Lovable](https://lovable.dev) com **React + Vite + TypeScript + Tailwind** no frontend e **Lovable Cloud (Supabase)** no backend.

---

## 🚀 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui |
| Roteamento | React Router v6 |
| Estado/dados | TanStack Query, hooks customizados |
| Backend | Lovable Cloud (Postgres + Auth + Storage + Edge Functions) |
| IA | Lovable AI Gateway (Gemini 2.5, GPT-5) |
| Integrações | Google Sheets API (sync de matrículas/calendário) |

---

## 📁 Estrutura do projeto

```
src/
├── components/
│   ├── ui/                    # shadcn/ui (não editar manualmente sem necessidade)
│   ├── course/                # Tabs e widgets da página de curso
│   │   ├── CourseInfoTab.tsx
│   │   ├── CourseClassesTab.tsx
│   │   ├── CourseEnrollmentsTab.tsx
│   │   ├── CourseLandingTab.tsx
│   │   ├── CourseOperationsTab.tsx
│   │   ├── CourseWhatsAppTab.tsx
│   │   ├── CourseProposal.tsx
│   │   ├── CourseAssistant.tsx       # Copiloto de vendas por curso
│   │   └── AssistantSidebar.tsx
│   ├── classGroups/           # Turmas combinadas (combo) e calendário
│   ├── settings/              # Regras de combo + módulos espelhados
│   ├── AppHeader.tsx
│   ├── ProtectedRoute.tsx     # Guarda auth + aprovação
│   └── GlobalAssistantButton.tsx
├── pages/
│   ├── Index.tsx              # Landing
│   ├── Auth.tsx               # Login / signup
│   ├── PendingApproval.tsx    # Tela pós-signup (espera aprovação admin)
│   ├── Dashboard.tsx          # Dashboard por unidade
│   ├── GlobalDashboard.tsx    # Visão consolidada SP + Brasília
│   ├── CourseDetail.tsx       # Página principal de um curso (tabs)
│   ├── CourseEditor.tsx       # Edição de campos do curso
│   ├── CourseCalendar.tsx     # Calendário de aulas
│   ├── ClassGroups.tsx        # Turmas combinadas
│   ├── QuickMessages.tsx      # Templates de WhatsApp
│   ├── ImportCourses.tsx      # Importar cursos via URL/PDF (IA)
│   ├── Settings.tsx           # Configurações (sheets, combos, mirrors)
│   ├── AdminApprovals.tsx     # Admin aprova novos usuários
│   └── AdminAudit.tsx         # Log de ações de aprovação
├── hooks/
│   ├── useAuth.tsx            # Sessão + perfil + role
│   ├── useEnrollments.tsx
│   ├── useCourseOverrides.tsx # Overrides por usuário (preço, datas, WA)
│   ├── useAssistantHistory.tsx
│   └── useSyncedData.tsx
├── lib/
│   ├── courseHelpers.ts
│   ├── courseSiblings.ts      # Lógica de cursos relacionados (combo)
│   ├── classGroupsResolver.ts # Resolve turma exibida (individual/combo/both)
│   └── whatsappTemplates.ts
└── integrations/supabase/     # Auto-gerado pelo Lovable Cloud — NÃO EDITAR

supabase/
├── functions/
│   ├── course-assistant/      # Edge function: copiloto de vendas (Lovable AI)
│   ├── extract-course/        # Edge function: extrai dados de curso de URL/PDF
│   └── sync-google-sheets/    # Edge function: sync de matrículas via Sheets
├── migrations/                # Migrations SQL (auto-aplicadas pelo Cloud)
└── config.toml
```

---

## 🔐 Autenticação e permissões

- **Signup** cria perfil em `profiles` com `approved=false`
- Usuário fica em `/pending-approval` até admin aprovar em `/admin/approvals`
- Roles em tabela separada `user_roles` (`admin` | `member`) — nunca em `profiles`
- Toda RLS usa as functions `is_approved(uuid)` e `has_role(uuid, app_role)` (SECURITY DEFINER)
- Login com Google habilitado

---

## 🗄️ Modelo de dados (principais tabelas)

| Tabela | O que guarda |
|---|---|
| `profiles` | Perfil + flag `approved` |
| `user_roles` | Roles (admin/member) — fonte da verdade de privilégios |
| `courses` | Cursos (nome, unidade, tipo, preço, módulos, capa) |
| `course_modules` | Módulos de cada curso |
| `course_classes` | Turmas individuais de cada curso |
| `class_groups` + `class_group_courses` | Turmas combinadas (combo) que agregam vários cursos |
| `course_combo_rules` | Regras que definem quando exibir turma como individual, combo ou both |
| `course_enrollments` / `enrollments_by_class` / `paid_students` | Dados sincronizados do Google Sheets |
| `calendar_events` | Eventos sincronizados do Sheets (calendário) |
| `user_course_overrides` | Overrides por vendedor (preço, datas, mensagens WA) sem alterar o curso master |
| `quick_messages` | Templates rápidos de WhatsApp do vendedor |
| `assistant_conversations` + `assistant_messages` | Histórico do copiloto IA |
| `approval_audit` | Log de aprovações/rejeições de usuários |
| `sheet_config` | Config do Google Sheets do usuário |

---

## 🤖 IA (Lovable AI Gateway)

Sem API key necessária — usa o gateway nativo do Lovable Cloud.

- **`course-assistant`** — copiloto de vendas que recebe contexto do curso + histórico e gera pitches NEPQ para WhatsApp
- **`extract-course`** — recebe URL ou PDF e extrai estrutura do curso (nome, módulos, carga, preço) usando Gemini

Modelos preferidos: `google/gemini-2.5-flash` (padrão), `google/gemini-2.5-pro` (extração complexa).

---

## 📊 Sync com Google Sheets

A edge function `sync-google-sheets` puxa três abas:
- **Matrículas individuais** → `course_enrollments`
- **Matrículas por turma** → `enrollments_by_class`
- **Calendário** → `calendar_events`
- **Pagos** → `paid_students`

Configuração em `/settings`. Service account configurada via secret `GOOGLE_SERVICE_ACCOUNT_JSON` no Lovable Cloud.

---

## 🛠️ Desenvolvimento local

```bash
# Clone
git clone <url-do-repo>
cd <repo>

# Instale deps
npm install
# ou: bun install

# Variáveis de ambiente (.env é gerenciado pelo Lovable Cloud)
# Já vem preenchido com VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID

# Dev server
npm run dev
```

> ⚠️ **Não edite manualmente:**
> - `src/integrations/supabase/client.ts`
> - `src/integrations/supabase/types.ts`
> - `.env`
> - `supabase/migrations/*` (use o painel do Lovable Cloud)

---

## 🔒 Segurança

- RLS ativada em todas as tabelas
- Roles em tabela separada com policy RESTRICTIVE
- Coluna `approved` em `profiles` só pode ser alterada por admin (via policy `WITH CHECK`)
- Bucket `course-covers`: upload/update/delete só para usuários aprovados; leitura pública apenas via URL individual (não permite `list()`)
- Extensão `pg_net` isolada no schema `extensions`
- Secrets (`LOVABLE_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`) ficam só no Cloud, nunca no repo

---

## 🚢 Deploy

Deploy automático pelo Lovable a cada commit no branch principal. URL pública: configurada em **Project Settings → Domains**.

Para publicar manualmente: botão **Publish** no editor do Lovable.

---

## 📚 Links

- [Documentação Lovable](https://docs.lovable.dev)
- [Lovable Cloud](https://docs.lovable.dev/features/cloud)
- [Lovable AI](https://docs.lovable.dev/features/ai)
