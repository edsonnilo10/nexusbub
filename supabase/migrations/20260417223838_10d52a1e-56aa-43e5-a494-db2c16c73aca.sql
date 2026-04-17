-- ============================================================
-- 1) STORAGE: bucket course-covers
--    Mantém leitura pública (capas precisam aparecer no site)
--    Restringe escrita a usuários autenticados
-- ============================================================

-- Remove policies antigas se existirem (idempotente)
DROP POLICY IF EXISTS "Public read course covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload course covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update course covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete course covers" ON storage.objects;

CREATE POLICY "Public read course covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-covers');

CREATE POLICY "Authenticated upload course covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course-covers');

CREATE POLICY "Authenticated update course covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course-covers')
  WITH CHECK (bucket_id = 'course-covers');

CREATE POLICY "Authenticated delete course covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-covers');

-- ============================================================
-- 2) TABELAS courses, course_modules, course_classes
--    Substitui policies USING (true) por checagem de aprovação
-- ============================================================

-- ---- courses ----
DROP POLICY IF EXISTS "Authenticated read courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated insert courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated update courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated delete courses" ON public.courses;

CREATE POLICY "Approved users read courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users update courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (public.is_approved(auth.uid()))
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.is_approved(auth.uid()));

-- ---- course_modules ----
DROP POLICY IF EXISTS "Authenticated read modules" ON public.course_modules;
DROP POLICY IF EXISTS "Authenticated insert modules" ON public.course_modules;
DROP POLICY IF EXISTS "Authenticated update modules" ON public.course_modules;
DROP POLICY IF EXISTS "Authenticated delete modules" ON public.course_modules;

CREATE POLICY "Approved users read modules"
  ON public.course_modules FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert modules"
  ON public.course_modules FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users update modules"
  ON public.course_modules FOR UPDATE
  TO authenticated
  USING (public.is_approved(auth.uid()))
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete modules"
  ON public.course_modules FOR DELETE
  TO authenticated
  USING (public.is_approved(auth.uid()));

-- ---- course_classes ----
DROP POLICY IF EXISTS "Authenticated read classes" ON public.course_classes;
DROP POLICY IF EXISTS "Authenticated insert classes" ON public.course_classes;
DROP POLICY IF EXISTS "Authenticated update classes" ON public.course_classes;
DROP POLICY IF EXISTS "Authenticated delete classes" ON public.course_classes;

CREATE POLICY "Approved users read classes"
  ON public.course_classes FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert classes"
  ON public.course_classes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users update classes"
  ON public.course_classes FOR UPDATE
  TO authenticated
  USING (public.is_approved(auth.uid()))
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete classes"
  ON public.course_classes FOR DELETE
  TO authenticated
  USING (public.is_approved(auth.uid()));