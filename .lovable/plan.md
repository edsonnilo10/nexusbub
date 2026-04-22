

## Correção das 4 vulnerabilidades do scan

Confirmei via scan + inspeção direta no banco. As duas "errors/warns" mais sérias são reais e abrem brecha hoje. Vou fechar todas.

### Diagnóstico real (já validado no banco)

| # | Severidade | Onde | Problema confirmado |
|---|---|---|---|
| 1 | 🔴 Error | `profiles` — policy `Users update own profile` | Sem `WITH CHECK` → usuário pode rodar `UPDATE profiles SET approved=true WHERE id=auth.uid()` e se auto-aprovar. **Brecha ativa.** |
| 2 | 🟠 Warn (crítica) | `storage.objects` — bucket `course-covers` | Existem **3 policies duplicadas** (`Authenticated upload`, `Owner update`, `Owner delete`) que ignoram `is_approved()`. Como policies são OR, qualquer logado (mesmo não-aprovado) sobe arquivo na pasta `<uid>/`. |
| 3 | 🟠 Warn | `storage.objects` — policy `Authenticated read course covers` | SELECT amplo permite `list()` de todos os arquivos do bucket. A leitura individual via URL pública continua funcionando pela policy `Public read individual course covers` (anon). |
| 4 | 🟡 Warn | Extensão `pg_net` no schema `public` | Boa prática: mover para schema `extensions`. |

### O que NÃO é problema (apesar do prompt sugerir)
- **"Raw Server Error Messages Exposed"** — não apareceu no scan. As edge functions atuais (`course-assistant`, `extract-course`, `sync-google-sheets`) já retornam mensagens genéricas no catch. Não vou mexer.
- **Coluna `role` em `profiles`** — não existe. Roles vivem em `user_roles` com policy RESTRICTIVE (já segura). O prompt do usuário superestimou.
- **Admin-only para upload de capas** — o padrão atual do app é "qualquer aprovado pode editar curso/capa". Não vou restringir só a admins (quebraria o fluxo); vou apenas garantir que **só aprovados** consigam, removendo as policies frouxas.

---

## Plano de execução (1 migration SQL, sem mudanças de código frontend)

### Migration única — corrige as 4 issues

**A) Fecha auto-aprovação em `profiles`**
- Drop policy `Users update own profile`
- Recria com `USING (auth.uid()=id)` **+** `WITH CHECK (auth.uid()=id AND approved = (SELECT approved FROM profiles WHERE id=auth.uid()))` — bloqueia mudança da coluna `approved` por não-admin
- Mantém `Admins update all profiles` intacta (admins continuam aprovando pelo painel)

**B) Limpa policies duplicadas do bucket `course-covers`**
- Drop `Authenticated upload course covers`
- Drop `Owner update course covers`
- Drop `Owner delete course covers`
- Sobram apenas as 3 policies que já exigem `is_approved(auth.uid())` (insert/update/delete) + a leitura

**C) Restringe listagem do bucket**
- Drop `Authenticated read course covers` (SELECT amplo a authenticated)
- A leitura via `<img src>` continua funcionando pela policy `Public read individual course covers` (já existente para `anon`)
- Resultado: ninguém consegue mais `list()` o bucket; URLs públicas individuais seguem funcionando

**D) Move extensão `pg_net` para schema `extensions`**
- `CREATE SCHEMA IF NOT EXISTS extensions;`
- `ALTER EXTENSION pg_net SET SCHEMA extensions;`

### E) Marcar findings como resolvidos
Após a migration aplicar, chamo `security--manage_security_finding` com `mark_as_fixed` para os 4 findings.

---

## Resumo do impacto

| Vulnerabilidade | Antes | Depois |
|---|---|---|
| Auto-aprovação de perfil | Qualquer user vira aprovado sozinho | Só admin altera `approved` |
| Upload de capa por não-aprovado | Qualquer logado sobe arquivo | Só aprovados |
| Listagem do bucket | Qualquer logado lista tudo | Bloqueado (URLs públicas seguem) |
| `pg_net` no public | Warn no scanner | Movido para `extensions` |

**Sem mudanças no frontend** — todos os fluxos atuais (admin aprova, aprovado edita curso/capa, `<img>` carrega capa) continuam funcionando idênticos.

