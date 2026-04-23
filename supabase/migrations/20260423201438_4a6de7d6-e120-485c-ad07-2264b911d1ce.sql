-- 1) Deduplicar paid_students
DELETE FROM public.paid_students a
USING public.paid_students b
WHERE a.id < b.id
  AND a.user_id IS NOT DISTINCT FROM b.user_id
  AND a.student_name IS NOT DISTINCT FROM b.student_name
  AND a.course_name IS NOT DISTINCT FROM b.course_name
  AND a.class_label IS NOT DISTINCT FROM b.class_label;

-- 2) Deduplicar calendar_events
DELETE FROM public.calendar_events a
USING public.calendar_events b
WHERE a.id < b.id
  AND a.user_id IS NOT DISTINCT FROM b.user_id
  AND a.unit IS NOT DISTINCT FROM b.unit
  AND a.course_name IS NOT DISTINCT FROM b.course_name
  AND a.event_label IS NOT DISTINCT FROM b.event_label
  AND a.start_date IS NOT DISTINCT FROM b.start_date;

-- 3) Deduplicar enrollments_by_class
DELETE FROM public.enrollments_by_class a
USING public.enrollments_by_class b
WHERE a.id < b.id
  AND a.user_id IS NOT DISTINCT FROM b.user_id
  AND a.unit IS NOT DISTINCT FROM b.unit
  AND a.course_name IS NOT DISTINCT FROM b.course_name
  AND a.class_label IS NOT DISTINCT FROM b.class_label
  AND a.class_start_date IS NOT DISTINCT FROM b.class_start_date;

-- 4) Adicionar UNIQUE constraints com NULLS NOT DISTINCT
ALTER TABLE public.paid_students
  ADD CONSTRAINT paid_students_sync_unique
  UNIQUE NULLS NOT DISTINCT (user_id, student_name, course_name, class_label);

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_sync_unique
  UNIQUE NULLS NOT DISTINCT (user_id, unit, course_name, event_label, start_date);

ALTER TABLE public.enrollments_by_class
  ADD CONSTRAINT enrollments_by_class_sync_unique
  UNIQUE NULLS NOT DISTINCT (user_id, unit, course_name, class_label, class_start_date);