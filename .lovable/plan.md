# Corrigir o desalinhamento do PDF da proposta (sem mudar o visual)

## Causas encontradas
1. **O valor quebra em duas linhas e passa da caixa verde** ("R$" em cima, "90.000,00" embaixo): o PDF é gerado como uma "foto" da página, e nessa foto a fonte fica mais larga do que na tela, então o número não cabe na largura da caixa.
2. **Textos sobrepostos e cortados na página do programa**: os 12 módulos não cabem numa única folha A4. O que passa do fim da folha é cortado, e os itens da lista ficam encavalados.
3. **O modo de captura usado primeiro é o menos fiel** à tela, o que piora o espaçamento entre as linhas.

## O que será feito
- Usar primeiro o modo de captura mais fiel, e só cair no outro se ele falhar.
- Valor total e valor da parcela: sempre numa linha só, com a fonte reduzindo automaticamente quando o número for grande, para caber na caixa verde sem mudar o desenho.
- Página do programa: quando os módulos não couberem numa folha, eles continuam em uma ou mais páginas seguintes, com o mesmo cabeçalho e o mesmo estilo, sem cortar nenhum módulo no meio.
- Fixar a altura das linhas nas listas de temas para evitar sobreposição.
- Testar baixando a proposta da Pós em Dor (com os 12 módulos) e conferir página por página.

## Detalhes técnicos
- `src/components/course/CourseProposal.tsx`: trocar a ordem do `foreignObjectRendering` (false primeiro); preço com `white-space: nowrap` e tamanho de fonte calculado pelo número de caracteres.
- Dividir os módulos em grupos medindo a altura de cada cartão no DOM (ou uma estimativa por número de tópicos) e renderizar várias `.proposal-page` para o programa; ajustar `TOTAL_PAGES` e os seletores `data-active-page` para um número dinâmico.
- `line-height` explícito nos itens de lista.
