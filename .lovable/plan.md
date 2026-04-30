## Objetivo

Substituir **todas** as turmas de São Paulo de 2026 pelo conjunto oficial enviado (JSON com 32 cursos / ~50 edições), corrigindo as datas erradas que aparecem hoje no Calendário, Dashboard e Mensagens.

## Estado atual

- ~50 grupos de turma SP em `class_groups` (com vínculos em `class_group_courses`) referentes a 2026, vários com datas incorretas.
- Mnemônicos no banco usam o sufixo curto (ex.: `CM US MAMA`); o JSON usa o sufixo `.SP` (ex.: `CM US MAMA.SP`). O mapeamento é direto removendo `.SP`.
- Todos os 32 códigos do JSON têm curso correspondente na tabela `courses`, exceto:
  - `CM US CAVF.SP` → mapear para o existente `CM US CAVE` (Carótidas e Vertebrais).
  - `CM US URGI.SP` (Urogineco) → não existe curso correspondente; tem mesma janela de `CM US DOGO.SP` (04–06/09). Precisa decisão.

## Plano de execução

1. **Limpar 2026 SP**: deletar de `class_group_courses` e `class_groups` todos os grupos com `unit='sao_paulo'` e `start_date >= 2026-01-01 AND start_date < 2027-01-01`. Isso remove todas as datas erradas e duplicadas.
2. **Inserir as ~50 edições do JSON** em `class_groups` (uma linha por edição) com:
   - `unit = 'sao_paulo'`
   - `start_date` / `end_date` do JSON
   - `status = 'atual'` se `start_date <= hoje <= end_date`, senão `'proxima'` (todas as datas são futuras → todas ficam `proxima`).
3. **Vincular cada edição ao curso** correspondente em `class_group_courses` com `display_mode = 'individual'` (mapeando código `.SP` → mnemonic sem `.SP`).
4. **Casos especiais**:
   - `CAVF` → vincular ao curso `CM US CAVE`.
   - `URGI` → conforme decisão abaixo.
5. **Não tocar** em `course_classes` (legado) nem em outras unidades (Brasília). Combos existentes em SP serão removidos junto com os grupos do passo 1; se algum combo precisar ser recriado a partir do JSON, será feito caso a caso.

## Decisão pendente

Vou perguntar antes de migrar como tratar **CM US URGI.SP** (Urogineco), que não tem curso cadastrado e divide a janela 04–06/09 com DOGO.

## Detalhes técnicos

- Operação executada via tool de inserção SQL (DELETE + INSERT), não migração de schema.
- Mapeamento `.SP` → mnemonic: simples `replace('.SP','')`.
- Após executar, validar com query agregada que cada edição do JSON resultou em exatamente 1 grupo + 1 vínculo, e que nenhuma data 01/01 ou fora de 2026 sobrou.
- Calendário (`CourseCalendar`), Dashboard, `QuickMessages` e abas de detalhe leem de `loadAllCourseClasses` / `useSyncedData`, então puxarão automaticamente os novos dados sem mudança de código.
