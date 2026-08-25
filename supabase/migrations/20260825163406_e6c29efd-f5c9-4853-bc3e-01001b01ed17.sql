INSERT INTO public.courses (id, name, mnemonic, type, unit, description, workload_hours, workload_breakdown, modality, highlights)
VALUES (
  'b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid,
  'Hemodinâmica Neonatal guiada por Ultrassom cardíaco avançado',
  'CM US NEO2',
  'modular',
  'sao_paulo',
  E'Curso avançado de ecocardiografia funcional neonatal voltado a quem já tem base em hemodinâmica do recém-nascido. Na UTI neonatal, cerca de 40% das condutas baseadas apenas em dados clínicos, monitorização não invasiva e laboratoriais podem estar incorretas — o ultrassom cardíaco à beira do leito permite definir a fisiopatologia e o fenótipo hemodinâmico com precisão e ajustar a conduta com segurança.\n\nObjetivos: desenvolver raciocínio hemodinâmico integrado (clínica + ecocardiografia + conduta), aprofundar a interpretação do recém-nascido crítico, estudar os diferentes fenótipos hemodinâmicos e aplicar medicina de precisão na UTI Neonatal.\n\nPúblico-alvo: neonatologistas, pediatras com atuação em neonatologia, intensivistas neonatais e ecocardiografistas pediátricos que atuem em terapia intensiva neonatal.\n\nPré-requisito: Graduação em Medicina e conhecimento básico em hemodinâmica do recém-nascido.\n\nCoordenação: Dra. Marina Maccagnano Zamith e Dra. Simone de Araújo Negreiros Figueira. Corpo docente: Allan Chiarati de Oliveira e Cristiane Metolina.\n\nCertificado de curso de extensão universitária. Frequência mínima de 75%. Turmas de até 15 alunos.',
  25,
  '10h teóricas + 15h práticas (3 dias presenciais, com hands-on em UTI neonatal)',
  'Presencial',
  E'• Imersão em casos clínicos reais, integrando clínica, ecocardiografia e discussão de conduta\n• Hands-on em pacientes reais na UTI neonatal da Maternidade Santa Maria\n• Estações de simulação realística supervisionadas (3 a 4 alunos por grupo)\n• Professores com expertise em hemodinâmica neonatal\n• Turmas reduzidas (máx. 15 alunos), com alta interação aluno-professor\n• Equipamento Philips semelhante ao usado no hospital de prática\n• Único no Brasil com esta profundidade: o tema costuma ser abordado apenas de forma sucinta dentro de pós-graduações em Neonatologia'
);

INSERT INTO public.course_modules (course_id, title, description, workload_hours, order_index) VALUES
('b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, 'Bases da avaliação hemodinâmica por ultrassom cardíaco', 'Revisão das técnicas ecocardiográficas com foco na avaliação hemodinâmica: janelas, medidas e integração dos dados ao raciocínio clínico.', 2, 1),
('b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, 'Transição neonatal e Canal Arterial Hemodinamicamente Significativo (CAHS)', 'Fisiologia da fase de transição no prematuro e avaliação do CAHS: critérios ecocardiográficos, repercussão sistêmica e pulmonar e implicações no tratamento.', 2, 2),
('b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, 'Débito cardíaco e fluxos regionais sistêmicos', 'Medida do débito cardíaco, avaliação de perfusão e fluxos regionais (cerebral, mesentérico, renal) e uso desses dados na definição do fenótipo hemodinâmico.', 1, 3),
('b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, 'Fenótipos hemodinâmicos: asfixia perinatal, choque séptico e hipertensão pulmonar', 'Diagnóstico diferencial hemodinâmico nos principais cenários críticos e escolha de suporte vasoativo guiada pelo ultrassom.', 4, 4),
('b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, 'Rastreamento de cardiopatias congênitas na UTIN', 'Como reconhecer sinais de alerta de cardiopatia estrutural durante a avaliação funcional e quando acionar o ecocardiografista pediátrico.', 1, 5),
('b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, 'Prática supervisionada: simulação realística e hands-on em UTI neonatal', 'Estações de simulação realística baseadas em casos reais (craniana, pulmonar, abdominal, gástrica e cardíaca), hands-on em pacientes reais e discussão de casos integrando clínica + ultrassom cardíaco + conduta.', 15, 6);

INSERT INTO public.class_group_courses (group_id, course_id, start_date, end_date, display_mode)
VALUES ('1e9d137b-017b-415d-a9b5-b9019f087476'::uuid, 'b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, '2026-10-30', '2026-11-01', 'individual');

INSERT INTO public.course_classes (course_id, start_date, end_date, status, location)
VALUES ('b7f1a2c0-9e31-4d55-8f21-3a5c7d901aa1'::uuid, '2026-10-30', '2026-11-01', 'proxima', 'São Paulo');
