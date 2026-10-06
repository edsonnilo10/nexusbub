# Atualização completa do calendário de São Paulo

## Objetivo
Substituir o calendário atual de São Paulo pela planilha enviada, mantendo apenas turmas a partir de 06/10/2026 e preservando toda a sequência das pós-graduações que começa em 2027 e termina em 2028.

## Atualizações
- Remover das agendas globais e das abas de cada curso todas as turmas de São Paulo encerradas antes de 06/10/2026.
- Substituir as datas restantes de 2026 e todas as datas de 2027 pelos períodos da nova planilha, eliminando datas antigas que não aparecem mais nela.
- Cadastrar a sequência completa 2027–2028 das pós-graduações ECOF, ECOV, GIOB, MEDI, PEDN e DORM; manter a primeira data informada para NEUR, pois a grade detalhada desse curso está vazia.
- Atualizar as mensagens e a aba “Turma 2027” das pós para refletirem as novas datas, inclusive os módulos de 2028.
- Vincular cada período ao curso correto para que a atualização apareça no calendário geral, nas turmas, no WhatsApp, nas propostas, no painel e nas demais abas que usam essas datas.

## Tratamento da planilha
- Ignorar linhas duplicadas, `#REF!` e linhas sem curso utilizável.
- Corrigir apenas erros tipográficos inequívocos de ano e formato, como `0207` → `2027`, `2025/2026` em término de período iniciado em 2027/2028 e datas sem zero à esquerda.
- Interpretar erros evidentes de sequência nas pós pela ordem mensal da própria grade, sem truncar os módulos de 2028.
- Não inventar períodos quando início ou fim não puder ser determinado com segurança.

## Rechecagem
- Comparar curso a curso a quantidade e os intervalos gravados com a planilha normalizada.
- Confirmar que não restou nenhuma turma de São Paulo anterior a 06/10/2026.
- Verificar duplicidades, datas invertidas, cursos sem vínculo e a continuidade 2027–2028 das pós.
- Conferir o calendário geral e abas de cursos no computador e no celular.
