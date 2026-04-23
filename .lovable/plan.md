

## Setup pós-conexão GitHub: CI + CODEOWNERS + PR template

Vou adicionar três arquivos de configuração que já vão sincronizar automaticamente para o seu repositório GitHub assim que eu sair do modo plano.

### O que será criado

**1. `.github/workflows/ci.yml`** — GitHub Actions
- Roda em cada push e pull request
- Instala dependências com `bun install`
- Executa typecheck (`tsc --noEmit`)
- Roda lint (`eslint`)
- Roda testes (`vitest run`)
- Faz build de produção (`vite build`) para garantir que nada quebrou

**2. `.github/CODEOWNERS`** — Donos do código
- Define você como reviewer obrigatório de tudo por padrão
- Marca pastas críticas (`supabase/migrations/`, `supabase/functions/`, `src/integrations/`) como ainda mais sensíveis
- Vou usar um placeholder `@seu-usuario-github` que você troca pelo seu handle real

**3. `.github/pull_request_template.md`** — Template de PR
- Checklist padrão: descrição, tipo de mudança, testes, screenshots
- Lembra de checar RLS quando mexer em tabelas
- Lembra de não commitar secrets

### Como usar depois (passo a passo que vou te ensinar)

Depois que eu criar os arquivos, eles aparecem no seu repo automaticamente (via sync bidirecional). Aí você precisa:

1. **Trocar o handle no CODEOWNERS**
   - Abrir `.github/CODEOWNERS` no GitHub (botão lápis)
   - Substituir `@seu-usuario-github` pelo seu username real do GitHub
   - Commit direto na branch principal

2. **Ativar branch protection** (opcional mas recomendado)
   - GitHub repo → Settings → Branches → Add rule
   - Branch name pattern: `main`
   - Marcar: "Require a pull request before merging"
   - Marcar: "Require status checks to pass" → selecionar `CI`
   - Marcar: "Require review from Code Owners"

3. **Ver o CI rodando**
   - Após o primeiro push pós-setup, abrir aba **Actions** no GitHub
   - Acompanhar o workflow `CI` rodando os 4 jobs (typecheck, lint, test, build)
   - Se der verde ✅ tudo certo. Se vermelho, clica no job pra ver o log

4. **Trabalhar localmente (opcional)**
   ```bash
   git clone https://github.com/SEU_USER/SEU_REPO.git
   cd SEU_REPO
   bun install
   bun run dev
   ```
   Qualquer commit que você der `git push` cai no Lovable em segundos.

### O que NÃO vou mexer

- Código da aplicação (`src/`, `supabase/`) — intacto
- README — já atualizei na rodada anterior
- Configs do Vite/Tailwind/TS — intactas

### Notas técnicas

- O workflow usa `oven-sh/setup-bun@v1` (oficial do Bun) com cache de dependências
- Job único com steps sequenciais para minimizar consumo de minutos do Actions (free tier tem 2000 min/mês)
- Não roda em PRs de Dependabot para evitar ruído (pode ser ajustado depois)
- Não faz deploy — Lovable já cuida do deploy automaticamente via sync

