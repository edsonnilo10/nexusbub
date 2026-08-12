-- 1) Cursos faltantes em SP
INSERT INTO public.courses (id, name, mnemonic, type, unit)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Ultrassonografia em Neonatologia', 'CM US NEON', 'modular', 'sao_paulo'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'CM US POGO: POCUS em Ginecologia e Obstetrícia', 'CM US POGO', 'modular', 'sao_paulo'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Pós-graduação lato sensu em Ecografia Vascular', 'PG US ECOV', 'pos_graduacao', 'sao_paulo')
ON CONFLICT (id) DO NOTHING;

-- 2) Limpa calendário SP de agosto/2026 em diante
DELETE FROM public.class_group_courses
WHERE group_id IN (
  SELECT id FROM public.class_groups WHERE unit = 'sao_paulo' AND start_date >= '2026-08-01'
);
DELETE FROM public.class_groups WHERE unit = 'sao_paulo' AND start_date >= '2026-08-01';

-- 3) Insere janelas novas
WITH w(start_date, end_date) AS (
  VALUES
    ('2026-08-28'::date,'2026-08-30'::date),
    ('2026-09-10','2026-09-12'),
    ('2026-09-11','2026-09-12'),
    ('2026-09-12','2026-09-13'),
    ('2026-10-01','2026-10-03'),
    ('2026-10-09','2026-10-11'),
    ('2026-10-16','2026-10-18'),
    ('2026-10-18',NULL),
    ('2026-10-23','2026-10-28'),
    ('2026-10-23','2026-10-25'),
    ('2026-10-27','2026-10-29'),
    ('2026-10-29','2026-10-31'),
    ('2026-10-30','2026-11-01'),
    ('2026-11-05','2026-11-06'),
    ('2026-11-06','2026-11-08'),
    ('2026-11-13','2026-11-15'),
    ('2026-11-13','2026-11-14'),
    ('2026-11-19','2026-11-20'),
    ('2026-11-19','2026-11-21'),
    ('2026-11-20','2026-11-22'),
    ('2026-11-21','2026-11-22'),
    ('2026-11-25','2026-11-29'),
    ('2026-11-27','2026-11-29'),
    ('2026-11-28','2026-11-29'),
    ('2026-12-10','2026-12-13'),
    ('2026-12-17',NULL)
)
INSERT INTO public.class_groups (unit, start_date, end_date, status)
SELECT 'sao_paulo', start_date, COALESCE(end_date, start_date), 'proxima' FROM w;

-- 4) Vincula cursos às janelas
WITH pairs(sd, ed, mnem) AS (
  VALUES
    ('2026-08-28'::date,'2026-08-30'::date,'CM US TRVG'),
    ('2026-09-10','2026-09-12','CM US ENPO'),
    ('2026-09-11','2026-09-12','CM US MOR1'),
    ('2026-09-12','2026-09-13','CM US MOR2'),
    ('2026-10-01','2026-10-03','CM US MESQ'),
    ('2026-10-09','2026-10-11','CM US PARI'),
    ('2026-10-09','2026-10-11','PG US ECOV'),
    ('2026-10-16','2026-10-18','CM US ECOA'),
    ('2026-10-18','2026-10-18','CM US SLPA'),
    ('2026-10-23','2026-10-28','CM US GIOB'),
    ('2026-10-23','2026-10-25','CM US PED1'),
    ('2026-10-23','2026-10-25','PG US MEDO'),
    ('2026-10-27','2026-10-29','CM US MAMA'),
    ('2026-10-29','2026-10-31','CM US TRVG'),
    ('2026-10-29','2026-10-31','CM US NEON'),
    ('2026-10-30','2026-11-01','CM PT MAMA'),
    ('2026-11-05','2026-11-06','CM US INME'),
    ('2026-11-06','2026-11-08','CM US CAVE'),
    ('2026-11-13','2026-11-15','CM US DAPO'),
    ('2026-11-13','2026-11-14','CM US POCE'),
    ('2026-11-19','2026-11-20','CM US TIRD'),
    ('2026-11-20','2026-11-22','CM US PED2'),
    ('2026-11-20','2026-11-22','CM US FEOG'),
    ('2026-11-21','2026-11-22','CM PT PUCT'),
    ('2026-11-25','2026-11-29','CM US MEDI'),
    ('2026-11-27','2026-11-29','CM US POGO'),
    ('2026-11-28','2026-11-29','CM PT PTMI'),
    ('2026-12-10','2026-12-13','CM US VAMI'),
    ('2026-12-17','2026-12-17','CM US PUVA')
)
INSERT INTO public.class_group_courses (group_id, course_id, display_mode)
SELECT g.id, c.id, 'individual'
FROM pairs p
JOIN public.class_groups g
  ON g.unit = 'sao_paulo' AND g.start_date = p.sd AND g.end_date = p.ed
JOIN public.courses c
  ON c.unit = 'sao_paulo' AND c.mnemonic = p.mnem;

-- Endometriose avançada (curso sem mnemônico)
INSERT INTO public.class_group_courses (group_id, course_id, display_mode)
SELECT g.id, 'a53b1ea0-cebb-4be5-a0e2-a96c2565dfcc', 'individual'
FROM public.class_groups g
WHERE g.unit = 'sao_paulo' AND g.start_date = '2026-11-19' AND g.end_date = '2026-11-21';