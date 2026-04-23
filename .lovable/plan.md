

## Conectar o hub ao GitHub

Você escolheu acessar o código via GitHub. Essa é a melhor opção para ter o repositório completo, com histórico de versões, e poder clonar/editar localmente.

### Como ativar (passo a passo no Lovable)

A conexão com o GitHub **não é feita por código** — é feita pela interface do Lovable, com sua conta. Eu não consigo ativar isso por você. Mas é rápido:

**No desktop:**
1. Canto superior direito do editor → ícone do **GitHub** (ou clique em **Share** → aba GitHub)
2. Clique em **Connect to GitHub**
3. Autorize o app **Lovable** na sua conta GitHub (vai abrir uma janela do GitHub)
4. Escolha a organização/conta onde o repositório será criado
5. Clique em **Create Repository**

**No mobile:**
1. Toque no botão `...` no canto inferior direito (modo Chat)
2. Toque em **GitHub** → **Connect to GitHub**
3. Mesmo fluxo de autorização

### O que acontece depois de conectar

- Um repositório novo é criado na sua conta GitHub com **todo o código atual do hub** (src/, supabase/functions/, supabase/migrations/, configs, etc.)
- **Sincronização bidirecional automática**: toda mudança que eu fizer aqui vai pro GitHub na hora, e qualquer commit que você fizer no GitHub volta pra cá
- Você pode clonar localmente: `git clone <url-do-repo>`
- Pode dar acesso à sua equipe pelas permissões normais do GitHub

### O que NÃO vai pro GitHub (por segurança)

- Secrets do Lovable Cloud (`LOVABLE_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, chaves do Supabase) — continuam só no Cloud
- Arquivos `.env` com valores reais — apenas o template
- Conteúdo do banco de dados (tabelas, registros) — só as migrations SQL vão

### Depois que conectar, me avisa

Se quiser, depois de conectado eu posso:
- Configurar um workflow do GitHub Actions
- Criar um README mais completo descrevendo a arquitetura do hub
- Adicionar um `.github/CODEOWNERS` ou templates de PR

**Documentação oficial:** https://docs.lovable.dev/integrations/git-integration

