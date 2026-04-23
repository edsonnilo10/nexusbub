

## Trocar a planilha do Sheets e re-sincronizar com os novos códigos

Boa notícia: **não precisa de nenhum código novo**. O sistema já está 100% preparado para esse cenário. A planilha é lida via Service Account (o "robô" que você criou), e a troca de URL é uma operação de configuração simples.

### O que você precisa fazer (passo a passo, na ordem)

#### 1. Compartilhar a nova planilha com o robô

Na **nova planilha** do Google Sheets:
- Clique em **Compartilhar** (canto superior direito)
- Cole o e-mail do robô (Service Account) — algo como `nome@projeto.iam.gserviceaccount.com`
- Defina como **Leitor**
- Desmarque "Notificar pessoas"
- Clique em **Compartilhar**

> Esse e-mail está dentro do JSON que você salvou no secret `GOOGLE_SERVICE_ACCOUNT_JSON` quando configurou o robô. Se não lembrar qual é, abra o JSON original ou me avise que eu busco nos logs.

#### 2. Atualizar o link no Hub

- Abrir **Configurações** (menu superior, ícone de engrenagem)
- No campo **URL da planilha**, apagar o link antigo e colar o **novo link completo** (`https://docs.google.com/spreadsheets/d/...`)
- Clicar em **Salvar**

#### 3. Validar a estrutura das abas

A função de sync procura **5 abas específicas** (nomes flexíveis — ignora acento e maiúsculas). A nova planilha precisa ter:

| Aba esperada | Colunas mínimas |
|---|---|
| **São Paulo** | Curso, Turma, Início, Fim, Alunos |
| **Brasília** | Curso, Turma, Início, Fim, Alunos |
| **GR base** | Aluno, Curso, Turma, Status, Contrato, Valor, Data Pagamento (importa só linhas com Status iniciando em `1.PAGO`) |
| **Calendário SP** | Curso, Turma/Evento, Início, Fim, Local, Coordenador |
| **Calendário DF** | Curso, Turma/Evento, Início, Fim, Local, Coordenador |

Se alguma aba estiver com nome muito diferente, o relatório de sync vai listar em "Abas não encontradas" — daí você renomeia ou me avisa para ajustar o matcher.

#### 4. Rodar a sincronização

- Ainda em Configurações, clicar em **Sincronizar agora**
- Aguardar o relatório aparecer com:
  - Quantas abas foram processadas
  - Quantos registros foram inseridos por aba
  - Quantos vínculos de turmas foram criados
  - Erros (se houver)

#### 5. Conferir os dados nas telas

- **Cursos (Planilha)** → conferir se vagas, pagos e pré batem
- **Turmas** → conferir se as janelas (datas) foram criadas
- **Dashboard** → conferir totais

### Sobre os "novos códigos" da planilha

O sync usa o **nome do curso** (não o código) como chave para casar com o cadastro do Hub. Cada nome de curso vira um `slug` automático. Se na nova planilha os nomes mudaram, podem acontecer duas coisas:

- **Curso novo no Hub** — se o nome não bater com nada existente, o sync **cria um curso novo** automaticamente
- **Curso "duplicado"** — se mudou só a grafia, vai aparecer um curso novo separado do antigo

**Se isso acontecer**, me avise depois do primeiro sync e eu te mostro como mesclar/renomear, ou preparo um mapeamento de aliases (planilha → cadastro existente).

### Riscos / pontos de atenção

| Risco | Mitigação |
|---|---|
| Robô sem acesso → sync falha com 403 | Passo 1 resolve |
| Nomes de curso diferentes → cria duplicatas | Reviso depois com você se acontecer |
| Datas em formato estranho → ficam null | O parser aceita `dd/mm/aaaa`, `dd-mm-aaaa` e ISO |
| Dados antigos da planilha anterior | O sync é **upsert por nome+turma**, não apaga — registros antigos sem correspondência continuam. Posso adicionar limpeza se quiser |

### O que NÃO precisa ser feito

- ❌ Criar Edge Function nova
- ❌ Pedir API Key do Google
- ❌ Mexer no secret `GOOGLE_SERVICE_ACCOUNT_JSON` (o robô continua o mesmo)
- ❌ Criar tabelas novas
- ❌ Tocar em código

### Se precisar, posso fazer depois

- Diagnóstico dos cursos que ficaram "órfãos" depois do sync
- Adicionar coluna de **código do curso** na planilha como chave alternativa de match (mais robusto que casar por nome)
- Criar tela de "mapeamento" para vincular nome da planilha → curso do Hub manualmente

