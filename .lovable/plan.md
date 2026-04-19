

## Diagnóstico de segurança

Rodei scan completo (Supabase linter + scanner de segurança + revisão manual). Resultado: **app já tem uma base sólida** (RLS em todas as tabelas, ProtectedRoute funcionando, RBAC com tabela `user_roles` + função `has_role`, edge functions exigindo JWT + aprovação, sem chaves secretas no front, sem `dangerouslySetInnerHTML` com input de usuário, validação Zod nos formulários de auth). Mas encontrei **3 brechas reais** que vou fechar.

### Vulnerabilidades encontradas

| # | Severidade | Onde | Problema |
|---|---|---|---|
| 1 | ⚠️ Média | Tabela `course_enrollments` (RLS) | Policies só checam `auth.uid() = user_id`, sem `is_approved()`. Usuário não-aprovado pode ler/gravar dados sensíveis de alunos (email, telefone, status pagamento) se o `user_id` bater. Inconsistente com as outras tabelas. |
| 2 | ⚠️ Baixa | Bucket `course-covers` (Storage) | Bucket público permite **listagem** de todos os arquivos (não só leitura individual). Qualquer um consegue enumerar capas de cursos. |
| 3 | ℹ️ Info | `src/pages/NotFound.tsx` | `console.error` logando rota acessada — vaza padrão de navegação no console em produção. |

### Itens já OK (verificados, não precisam mexer)
- ✅ Todas as rotas privadas usam `<ProtectedRoute>`; `adminOnly` aplicado em `/settings` e `/admin/approvals`
- ✅ RBAC: roles em tabela separada (`user_roles`) com `has_role()` SECURITY DEFINER — sem risco de escalada
- ✅ RLS habilitado em todas as 10 tabelas; nenhuma policy `USING (true)`
- ✅ Edge functions (`course-assistant`, `extract-course`, `sync-sheet`) validam JWT + checam aprovação
- ✅ Nenhuma `SERVICE_ROLE_KEY` ou chave secreta no código cliente
- ✅ Validação Zod em login/cadastro/reset
- ✅ Único `dangerouslySetInnerHTML` (em `chart.tsx`) é CSS gerado a partir de config interna, sem input de usuário
- ✅ Sessão no `localStorage` é o padrão do Supabase JS (cookies HttpOnly não são viáveis com SDK SPA — trade-off aceito pela arquitetura)

---

## O que vou alterar

### 1. Migration SQL — corrige RLS de `course_enrollments` + listagem do bucket
- Substituir as 4 policies de `course_enrollments` por versões que exigem **`auth.uid() = user_id` AND `is_approved(auth.uid())`**
- Restringir a policy SELECT pública do bucket `course-covers`: trocar por leitura pública apenas de objetos individuais (mantendo `<img src>` funcionando) e bloqueando `list()` anônimo — vou criar policy que permite SELECT só com `name IS NOT NULL` mantendo uso de URLs públicas, mas autenticando a listagem

### 2. `src/pages/NotFound.tsx`
- Remover `console.error` que loga a rota acessada

### 3. Tratamento genérico de erros (boas práticas — já está razoável, vou reforçar)
- Revisar 2-3 toasts onde o `error.message` cru do Postgres pode vazar nomes de coluna; trocar por mensagens genéricas amigáveis nos pontos críticos (auth e mutations sensíveis)

### 4. Habilitar HIBP (proteção contra senhas vazadas)
- Ativar via `configure_auth` (`password_hibp_enabled: true`) — bloqueia cadastro/troca com senhas comprometidas

### Não vou mexer (e por quê)
- **Cookies HttpOnly**: Supabase JS SDK em SPA usa `localStorage` por design. Migrar exigiria SSR (Next.js) — fora do escopo. O token é JWT de curta duração com refresh automático, padrão da indústria para SPAs.
- **`console.error` nas edge functions**: rodam no servidor, não vazam para o cliente — são essenciais para debug.
- **Policy "Admins manage roles"** do `user_roles`: o scan marcou como warn mas a policy RESTRICTIVE complementar já bloqueia escalada. Confirmado seguro.

---

## Resumo final que você verá

Após aplicar, vou te entregar uma tabela com: **vulnerabilidade encontrada → correção aplicada → impacto**. Tudo em uma migration SQL + 1 edição em `NotFound.tsx` + 1 chamada de configure_auth.

