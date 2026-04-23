## 📝 Descrição

<!-- O que esse PR faz? Por quê? Link para issue/ticket se houver. -->

## 🔧 Tipo de mudança

- [ ] 🐛 Bugfix (correção sem quebrar contrato)
- [ ] ✨ Nova feature (adiciona funcionalidade)
- [ ] ♻️ Refactor (mudança interna, sem alterar comportamento)
- [ ] 📝 Documentação
- [ ] 🎨 UI / estilo
- [ ] ⚡ Performance
- [ ] 🔒 Segurança
- [ ] 🧪 Testes
- [ ] 🏗️ Build / CI / config

## ✅ Checklist

- [ ] Rodei `bun run dev` e validei localmente (ou no preview do Lovable)
- [ ] Typecheck passa (`bunx tsc --noEmit`)
- [ ] Lint passa (`bunx eslint .`)
- [ ] Testes passam (`bunx vitest run`)
- [ ] Build de produção passa (`bunx vite build`)

## 🗄️ Banco de dados (se aplicável)

- [ ] Não mexi em tabelas / migrations
- [ ] Mexi e revisei **RLS** das tabelas afetadas
- [ ] Mexi e mantive `is_approved()` / `has_role()` onde necessário
- [ ] Não usei foreign key direta para `auth.users`

## 🔐 Segurança

- [ ] Nenhum secret commitado (`.env`, chaves, tokens)
- [ ] Não expus dados de outros usuários (escopei queries por `user_id`)
- [ ] Edge functions novas têm tratamento de erro e validação de input

## 📸 Screenshots / vídeo (se for UI)

<!-- Cole prints ou um GIF curto. Antes/depois ajuda muito. -->

## 🧠 Notas para o reviewer

<!-- Algo específico que você quer que olhem com atenção? Trade-offs? -->
