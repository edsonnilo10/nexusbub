# Tutorial de boas-vindas para novos usuários

## O que o usuário verá
Na primeira vez que um usuário aprovado entrar, abre uma janela de boas-vindas com 6 passos curtos (botões Anterior / Próximo / Pular):

1. **Boas-vindas** — o que é o Hub Nexus e para que serve.
2. **Cursos** — buscar por nome ou código, filtrar por cidade (São Paulo / Brasília) e por tipo (modular ou pós).
3. **Página do curso** — abas Apresentação, Turmas, Cronograma, Turma 2027 e Datas por bloco.
4. **WhatsApp** — escolher 2026 ou 2027, copiar mensagem curta, completa, de conteúdo e de investimento (sempre dentro do limite do WhatsApp).
5. **PDFs** — "Gerar PDF" do curso e "PDF do calendário" com filtros de cidade, tipo, período e tema.
6. **Calendário e Mensagens rápidas** — consultar datas por mês e mensagens prontas.

Ao terminar ou pular, não aparece de novo. Um botão **"Ver tutorial"** no menu do topo permite rever a qualquer momento. Administradores veem um passo extra sobre aprovações e cadastro de cursos; usuários comuns não veem nada de funções de administrador.

## Por que não quebra o sistema
- É só uma janela por cima das telas existentes: nenhuma página, rota, mensagem ou dado de curso muda.
- A marcação "já viu o tutorial" fica salva no navegador; se algo falhar, o tutorial simplesmente não aparece e o app segue normal.
- Não altera permissões nem o banco de dados.

## Detalhes técnicos
- Novo `src/components/WelcomeTour.tsx` usando o `Dialog` do shadcn, com passos em array e indicador de progresso; textos em português, tokens do design system.
- Montado dentro do layout protegido (após `ProtectedRoute` aprovado), exibido quando `localStorage["nexus-welcome-tour-v1:<userId>"]` não existe; versão no nome da chave permite reapresentar após mudanças grandes.
- Passo de admin condicionado a `isAdmin` de `useAuth`.
- Item "Ver tutorial" em `AppHeader.tsx` que reabre via evento/estado.
- Validação com Playwright autenticado: abre na primeira entrada, não reabre após "Pular", reabre pelo menu, sem erros no console.
