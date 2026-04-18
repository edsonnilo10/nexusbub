
Vou aplicar exatamente a estratégia que você passou: clone fixo no body + JPEG, mantendo a página 1 (capa) também via DOM para preservar a fidelidade visual que já está OK, e as páginas 2–8 continuando via render vetorial nativo do jsPDF (que já está estável e sem branco).

Espera — relendo seu pedido, você quer que **todas as 8 páginas** voltem a ser capturadas via `html2canvas` usando a Técnica do Clone Fixo + JPEG, abandonando o vetorial. Isso garante 1:1 com a prévia em todas as páginas, não só na capa.

## O que vou alterar

Arquivo único: `src/components/course/CourseProposal.tsx`

1. **Substituir `renderProposalPage`** pela versão com Clone Fixo:
   - `cloneNode(true)` da página
   - Anexa no `document.body` com `position: fixed`, `top:0`, `left:0`, `width:210mm`, `height:297mm`, `zIndex:-9999`, `display:block`, `backgroundColor:#fff`, `overflow:hidden`, `transform:none`
   - Aguarda 150ms para reflow/fontes
   - Chama `html2canvas` com `scrollX:0`, `scrollY:0`, `windowWidth/Height` baseados no clone
   - Remove o clone no `finally`

2. **Substituir `handleDownload`** pela versão simplificada:
   - Não mexe mais em `data-exporting`, não força `display:block` nas páginas reais, não rola a tela
   - Só itera as 8 `.proposal-page`, clona, renderiza, exporta como **JPEG 0.95**, adiciona ao PDF
   - Aguarda `document.fonts.ready` e imagens
   - Toast de sucesso/erro, restaura só o `setDownloading(false)`

3. **Remover** todo o código vetorial nativo das páginas 2–8 que foi adicionado antes (helpers `writePdfParagraph`, `drawPdfPill`, `measurePdfPillWidth`, `loadImageAsDataUrl`, interface `ProposalPdfData`, e a montagem manual via `pdf.text/roundedRect/circle`). Isso simplifica o arquivo e elimina o desalinhamento visual das páginas internas.

4. **Manter intactos**:
   - JSX da prévia (8 `.proposal-page`)
   - `useCourseOverrides` e edição inline de campos
   - Navegação entre páginas no preview
   - `proposalRef` apontando para o container das 8 páginas

## Riscos conhecidos (e como mitigo)

- **Memória no iOS com 8 páginas**: o JPEG 0.95 + clone descartado a cada iteração resolve isso (era o motivo do branco anterior).
- **Fontes/imagens não carregadas no clone**: `document.fonts.ready` + 150ms de espera pós-append.
- **Ícones SVG/lucide dentro das páginas**: `html2canvas` lida bem com SVG inline; sem mudanças necessárias.

## Resultado esperado

PDF com 8 páginas, todas idênticas à pré-visualização (incluindo capa, módulos, investimento, datas), sem branco no celular e arquivo leve o suficiente para mandar no WhatsApp.
