-- =====================================================
-- FASE 1: Schema class_groups
-- =====================================================

-- 1. Tabela mestre: cada janela de turma
CREATE TABLE public.class_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit course_unit NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status class_status NOT NULL DEFAULT 'proxima',
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unit, start_date, end_date)
);

ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users read groups" ON public.class_groups
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Approved users insert groups" ON public.class_groups
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Approved users update groups" ON public.class_groups
  FOR UPDATE TO authenticated USING (is_approved(auth.uid())) WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Approved users delete groups" ON public.class_groups
  FOR DELETE TO authenticated USING (is_approved(auth.uid()));

CREATE TRIGGER class_groups_updated_at
  BEFORE UPDATE ON public.class_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_class_groups_unit_dates ON public.class_groups(unit, start_date);
CREATE INDEX idx_class_groups_status ON public.class_groups(status);

-- 2. Vínculos curso ↔ janela
CREATE TYPE public.class_display_mode AS ENUM ('individual', 'combo_only', 'both');

CREATE TABLE public.class_group_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  start_date date,  -- override opcional (ex: TRVG só nos 3 primeiros dias)
  end_date date,
  display_mode class_display_mode NOT NULL DEFAULT 'individual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, course_id)
);

ALTER TABLE public.class_group_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users read group courses" ON public.class_group_courses
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Approved users insert group courses" ON public.class_group_courses
  FOR INSERT TO authenticated WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Approved users update group courses" ON public.class_group_courses
  FOR UPDATE TO authenticated USING (is_approved(auth.uid())) WITH CHECK (is_approved(auth.uid()));
CREATE POLICY "Approved users delete group courses" ON public.class_group_courses
  FOR DELETE TO authenticated USING (is_approved(auth.uid()));

CREATE INDEX idx_class_group_courses_course ON public.class_group_courses(course_id);

-- 3. Regras de combo configuráveis
CREATE TABLE public.course_combo_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_course_ids uuid[] NOT NULL,  -- se TODOS estes cursos caem na mesma janela...
  combo_course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,  -- ...adicionar este combo
  individuals_display_mode class_display_mode NOT NULL DEFAULT 'both',  -- como mostrar os individuais
  combo_display_mode class_display_mode NOT NULL DEFAULT 'combo_only',  -- como mostrar o combo
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_combo_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users read combo rules" ON public.course_combo_rules
  FOR SELECT TO authenticated USING (is_approved(auth.uid()));
CREATE POLICY "Admins manage combo rules" ON public.course_combo_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER combo_rules_updated_at
  BEFORE UPDATE ON public.course_combo_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. MIGRAÇÃO: converter course_classes existentes em class_groups
-- Agrupa por (unit, start_date, end_date) — janelas idênticas viram uma única
INSERT INTO public.class_groups (unit, start_date, end_date, status, location, notes)
SELECT DISTINCT
  c.unit,
  cc.start_date,
  cc.end_date,
  -- Se houver vários status na mesma janela, prioriza atual > proxima > aguardando > encerrada
  (SELECT cc2.status FROM public.course_classes cc2
   JOIN public.courses c2 ON c2.id = cc2.course_id
   WHERE c2.unit = c.unit AND cc2.start_date = cc.start_date AND cc2.end_date = cc.end_date
   ORDER BY CASE cc2.status
     WHEN 'atual' THEN 1
     WHEN 'proxima' THEN 2
     WHEN 'aguardando_confirmacao' THEN 3
     WHEN 'encerrada' THEN 4
   END
   LIMIT 1) AS status,
  (SELECT cc2.location FROM public.course_classes cc2
   JOIN public.courses c2 ON c2.id = cc2.course_id
   WHERE c2.unit = c.unit AND cc2.start_date = cc.start_date AND cc2.end_date = cc.end_date
     AND cc2.location IS NOT NULL
   LIMIT 1) AS location,
  NULL::text AS notes
FROM public.course_classes cc
JOIN public.courses c ON c.id = cc.course_id
WHERE cc.start_date IS NOT NULL AND cc.end_date IS NOT NULL
ON CONFLICT (unit, start_date, end_date) DO NOTHING;

-- Vincular cada course_class ao seu novo grupo
INSERT INTO public.class_group_courses (group_id, course_id, start_date, end_date, display_mode, notes)
SELECT
  cg.id,
  cc.course_id,
  CASE WHEN cc.start_date <> cg.start_date OR cc.end_date <> cg.end_date THEN cc.start_date ELSE NULL END,
  CASE WHEN cc.start_date <> cg.start_date OR cc.end_date <> cg.end_date THEN cc.end_date ELSE NULL END,
  'individual'::class_display_mode,
  cc.notes
FROM public.course_classes cc
JOIN public.courses c ON c.id = cc.course_id
JOIN public.class_groups cg
  ON cg.unit = c.unit
  AND cg.start_date = cc.start_date
  AND cg.end_date = cc.end_date
WHERE cc.start_date IS NOT NULL AND cc.end_date IS NOT NULL
ON CONFLICT (group_id, course_id) DO NOTHING;