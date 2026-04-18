-- Enums for enrollment status
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'isento', 'cancelado');
CREATE TYPE public.contract_status AS ENUM ('sem_contrato', 'em_contrato', 'assinado');

-- Sheet config: one row per user with the spreadsheet URL
CREATE TABLE public.sheet_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  sheet_url TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sheet_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sheet config"
  ON public.sheet_config FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sheet config"
  ON public.sheet_config FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sheet config"
  ON public.sheet_config FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own sheet config"
  ON public.sheet_config FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_sheet_config_updated_at
  BEFORE UPDATE ON public.sheet_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Course enrollments synced from spreadsheet
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  class_id UUID,
  student_name TEXT NOT NULL,
  student_email TEXT,
  student_phone TEXT,
  payment_status public.payment_status NOT NULL DEFAULT 'pendente',
  contract_status public.contract_status NOT NULL DEFAULT 'sem_contrato',
  class_start_date DATE,
  class_end_date DATE,
  class_label TEXT,
  source_sheet TEXT,
  source_row INTEGER,
  notes TEXT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_enrollments_user_course ON public.course_enrollments(user_id, course_id);
CREATE INDEX idx_course_enrollments_class ON public.course_enrollments(class_id);
CREATE UNIQUE INDEX idx_course_enrollments_unique
  ON public.course_enrollments(user_id, course_id, lower(student_name), COALESCE(class_start_date, '1900-01-01'::date));

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enrollments"
  ON public.course_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own enrollments"
  ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own enrollments"
  ON public.course_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own enrollments"
  ON public.course_enrollments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();