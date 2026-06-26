## Objetivo

Atualizar a aba do curso **CM US POCE – POCUS Essencial: Ultrassom em Urgências e Emergências** nas duas unidades (Brasília e São Paulo) com base no PDF enviado, replicando o mesmo padrão usado no DAPO.

## Cursos identificados no banco

- Brasília: `c155b402-118f-4e35-b778-f712edbe47ed` — "CM US POCE: Essencial: Ultrassom em Urgências e Emergências"
- São Paulo: `d44295e8-f290-445a-aee4-e89599cfa525` — "Essencial: Ultrassom em Urgências e Emergências"

## Alterações em `courses` (ambas unidades)

- `name`: "CM US POCE: POCUS Essencial – Ultrassom em Urgências e Emergências"
- `description`: parágrafo sucinto destacando POCUS como extensão do exame físico, raciocínio clínico à beira-leito e tomada de decisão em urgência/emergência/UTI
- `workload_hours`: 30 (15h teóricas online + 15h práticas presenciais; 20h presenciais no total)
- `modality`: "Híbrido"
- `highlights`: público-alvo (médicos generalistas, residentes, emergencistas, intensivistas, internos a partir do 9º semestre), diferenciais (teoria online libera tempo para prática, equipamentos de última geração de diferentes fabricantes, mentoria em grupo mensal por 3 meses pós-curso), turmas com até 24 alunos

## Módulos (`course_modules`) — apagar e reinserir os 7 do PDF

1. Fundamentos do Ultrassom — princípios, transdutores, ajustes, artefatos, orientação e posicionamento
2. POCUS Abdominal — anatomia, líquido livre, vesícula biliar, aorta abdominal
3. POCUS Pulmonar — linhas A/B, consolidação, derrame pleural, pneumotórax
4. POCUS Vascular — anatomia, TVP, acesso vascular guiado
5. POCUS Cardíaco — janelas ecocardiográficas, análise qualitativa, derrame pericárdico, volemia
6. Protocolos em Emergência — FAST, e-FAST, BLUE, RUSH, CAUSE
7. Procedimentos Guiados por Ultrassom + aulas bônus (ajustes de imagem, anatomia aplicada, bioética do POCUS)

Cada módulo recebe carga horária estimada coerente com o total de 30h.

## Catálogo SP

Confirmar que `src/data/coursesSP.ts` já tem `CM US POCE.SP` com o nome correto (já presente — sem alteração necessária).

## Detalhes técnicos

- Uma única migração SQL com `UPDATE` nos dois `courses` + `DELETE`/`INSERT` em `course_modules` via CTE referenciando os dois `course_id`.
- As mensagens do WhatsApp (curta, completa, follow-up, conteúdo programático, investimento) regeneram automaticamente a partir dos novos dados em ambas as unidades.
- Datas das turmas não são alteradas.
