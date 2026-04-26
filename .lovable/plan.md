# Plano: Reforçar `.gitignore` com entradas de variáveis de ambiente

## Contexto

O `.gitignore` atual cobre `*.local` (linha 13), o que já bloqueia arquivos como `.env.local` e `.env.production.local`. Porém, **não cobre explicitamente** `.env`, `.env.production` e `.env.development` — esses arquivos podem conter chaves sensíveis (Supabase service role, tokens de API, secrets) e seriam versionados acidentalmente se criados.

A ressalva do usuário em rodadas anteriores reforça a importância dessa proteção: variáveis de ambiente nunca devem ser versionadas.

## Mudança proposta

**Arquivo:** `.gitignore` (único arquivo modificado)

Inserir um bloco com 5 linhas **antes** da linha final `*.sw?` (linha 24), preservando o restante do arquivo intacto.

### Conteúdo a inserir (após linha 23 `*.sln`, antes de `*.sw?`):

```
# Variáveis de ambiente — NUNCA versionar
.env
.env.local
.env.*.local
.env.production
.env.development
```

> Observação: incluí o comentário `# Variáveis de ambiente — NUNCA versionar` para deixar a intenção explícita no arquivo (consistente com o padrão do projeto, que já usa cabeçalhos de seção como `# Logs` e `# Editor directories and files`). Se preferir adicionar apenas as 5 linhas sem o comentário, é só sinalizar.

## Resultado final do `.gitignore`

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln

# Variáveis de ambiente — NUNCA versionar
.env
.env.local
.env.*.local
.env.production
.env.development

*.sw?
```

## Notas

- `.env.local` e `.env.*.local` já são cobertos por `*.local`, mas mantê-los explícitos torna a regra autoexplicativa e resistente a refatorações futuras do `.gitignore`.
- Nenhum outro arquivo será tocado.
- O `.env` atual do projeto (com `VITE_SUPABASE_*`) é gerado/gerenciado automaticamente pela plataforma — essa mudança apenas garante que ele e variantes futuras não sejam commitados.

## Risco

Nenhum. É uma mudança puramente defensiva em arquivo de configuração de VCS, sem impacto em build, runtime ou tipos.
