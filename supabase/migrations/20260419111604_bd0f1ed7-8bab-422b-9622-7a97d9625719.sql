-- Habilita extensões para agendamento de cron + chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 1. enrollments_by_class (abas SP + DF)
-- ============================================
CREATE TABLE public.enrollments_by_class (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit public.course_unit NOT NULL,
  course_id UUID,
  course_name TEXT NOT NULL,
  class_label TEXT,
  class_start_date DATE,
  class_end_date DATE,
  student_count INTEGER NOT NULL DEFAULT 0,
  source_sheet TEXT,
  source_row INTEGER,
  notes TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrollments_by_class_user ON public.enrollments_by_class(user_id);
CREATE INDEX idx_enrollments_by_class_course ON public.enrollments_by_class(course_id);
CREATE INDEX idx_enrollments_by_class_unit ON public.enrollments_by_class(unit);
CREATE UNIQUE INDEX uq_enrollments_by_class
  ON public.enrollments_by_class(user_id, unit, course_name, COALESCE(class_label, ''), COALESCE(class_start_date, '1900-01-01'::date));

ALTER TABLE public.enrollments_by_class ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users view own class enrollments"
ON public.enrollments_by_class FOR SELECT TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert own class enrollments"
ON public.enrollments_by_class FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users update own class enrollments"
ON public.enrollments_by_class FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete own class enrollments"
ON public.enrollments_by_class FOR DELETE TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE TRIGGER set_updated_at_enrollments_by_class
BEFORE UPDATE ON public.enrollments_by_class
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. paid_students (aba GR base, status 1.PAGO)
-- ============================================
CREATE TABLE public.paid_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT,
  student_phone TEXT,
  course_id UUID,
  course_name TEXT,
  class_label TEXT,
  class_start_date DATE,
  payment_status TEXT NOT NULL DEFAULT '1.PAGO',
  contract_status TEXT,
  amount NUMERIC,
  payment_date DATE,
  source_sheet TEXT,
  source_row INTEGER,
  notes TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_paid_students_user ON public.paid_students(user_id);
CREATE INDEX idx_paid_students_course ON public.paid_students(course_id);
CREATE INDEX idx_paid_students_name ON public.paid_students(student_name);
CREATE UNIQUE INDEX uq_paid_students
  ON public.paid_students(user_id, student_name, COALESCE(course_name, ''), COALESCE(class_label, ''));

ALTER TABLE public.paid_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users view own paid students"
ON public.paid_students FOR SELECT TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert own paid students"
ON public.paid_students FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users update own paid students"
ON public.paid_students FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete own paid students"
ON public.paid_students FOR DELETE TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE TRIGGER set_updated_at_paid_students
BEFORE UPDATE ON public.paid_students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. calendar_events (calendário SP + DF)
-- ============================================
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit public.course_unit NOT NULL,
  course_id UUID,
  course_name TEXT NOT NULL,
  event_label TEXT,
  start_date DATE,
  end_date DATE,
  location TEXT,
  coordinator TEXT,
  source_sheet TEXT,
  source_row INTEGER,
  notes TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_user ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_course ON public.calendar_events(course_id);
CREATE INDEX idx_calendar_events_unit ON public.calendar_events(unit);
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_date);
CREATE UNIQUE INDEX uq_calendar_events
  ON public.calendar_events(user_id, unit, course_name, COALESCE(event_label, ''), COALESCE(start_date, '1900-01-01'::date));

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users view own calendar events"
ON public.calendar_events FOR SELECT TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert own calendar events"
ON public.calendar_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users update own calendar events"
ON public.calendar_events FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete own calendar events"
ON public.calendar_events FOR DELETE TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE TRIGGER set_updated_at_calendar_events
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();