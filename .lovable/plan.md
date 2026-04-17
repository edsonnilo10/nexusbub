
# Hub Nexus Ultrassonografia — Plano

## Visão geral
Um hub interno (com login) para você e a equipe consultarem todos os cursos da Nexus em um só lugar — bonito, organizado e pronto para apresentar a leads. Cada curso tem sua página completa, uma landing page exportável e textos prontos para WhatsApp.

## Estrutura do app

### 1. Login (Lovable Cloud)
- Acesso restrito por e-mail/senha — só sua equipe entra.
- Tela simples com logo Nexus.

### 2. Dashboard / Lista de cursos (home)
- Grid de cards com todos os cursos: capa, nome, carga horária, próxima turma, valor.
- Filtros por tipo (Pós-graduação / Curso modular) e busca por nome.
- Botão **"+ Novo curso"** e **"Importar planilha"** (XLSX/CSV).

### 3. Página do curso (3 abas internas)
**Aba 1 — Informações**
- Carga horária, modalidade, datas (turma atual + próxima), valor, formas de pagamento.
- Conteúdo programático / módulos (lista organizada).

**Aba 2 — Apresentação (Landing)**
- Página comercial bonita gerada automaticamente: hero com nome do curso, destaques (carga horária, próxima turma, investimento), grade de módulos, CTA.
- Botões: **Modo apresentação (fullscreen)**, **Exportar PDF**, **Copiar link**.

**Aba 3 — Texto para WhatsApp**
- Textos prontos gerados a partir dos dados do curso, em variações:
  - Mensagem curta (resumo + valor + CTA)
  - Mensagem completa (com módulos e datas)
  - Mensagem de follow-up
- Botão **"Copiar"** em cada um, com formatação WhatsApp (negrito com `*`, emojis, quebras).

### 4. Painel de edição do curso
- Formulário com todos os campos (nome, tipo, carga horária, datas das turmas, valor, parcelas, módulos, capa).
- Adicionar/remover módulos dinamicamente.
- Upload de imagem de capa.

### 5. Importação da planilha
- Tela de upload XLSX/CSV.
- Mapeamento automático das colunas (nome, carga horária, valor, etc.) com preview antes de salvar.
- Cria os cursos em lote; depois você edita pelo painel.

## Identidade visual
- Estilo clean e profissional, adequado a área médica.
- Paleta sugerida: azul profundo + branco + um acento (verde-água ou dourado) — refino na implementação.
- Tipografia legível, layout espaçoso, cards com sombra suave.

## Stack técnica
- **Lovable Cloud** para autenticação, banco (cursos, turmas, módulos, usuários) e armazenamento de imagens de capa.
- **Exportação PDF** da landing direto no navegador.
- **Importador de planilhas** com SheetJS.
- Tudo em React + Tailwind, responsivo (funciona em notebook na hora de apresentar).

## Entrega faseada
**Fase 1 (esta build):** login, lista de cursos, página do curso com as 3 abas, edição manual, importação de planilha, exportar PDF e textos de WhatsApp.

**Fase 2 (futura, se quiser):** modo apresentação fullscreen tipo slides, métricas (cursos mais vistos), envio direto para WhatsApp via link `wa.me`, área pública opcional.
