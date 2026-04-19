-- 1. Reforçar RLS de course_enrollments exigindo aprovação
DROP POLICY IF EXISTS "Users view own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users insert own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users update own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users delete own enrollments" ON public.course_enrollments;

CREATE POLICY "Approved users view own enrollments"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users insert own enrollments"
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users update own enrollments"
ON public.course_enrollments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()))
WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete own enrollments"
ON public.course_enrollments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

-- 2. Storage: bloquear listagem anônima do bucket course-covers
-- Mantém leitura pública individual (URLs públicas continuam funcionando para <img src>),
-- mas exige autenticação para listar/enumerar objetos.
DROP POLICY IF EXISTS "Public read course covers" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course covers" ON storage.objects;
DROP POLICY IF EXISTS "Course covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users list course covers" ON storage.objects;
DROP POLICY IF EXISTS "Approved users upload course covers" ON storage.objects;
DROP POLICY IF EXISTS "Approved users update course covers" ON storage.objects;
DROP POLICY IF EXISTS "Approved users delete course covers" ON storage.objects;

-- Leitura pública só permite acesso direto (URL pública), sem listagem anônima
CREATE POLICY "Public read individual course covers"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'course-covers' AND name IS NOT NULL);

-- Usuários autenticados podem listar/ler
CREATE POLICY "Authenticated read course covers"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'course-covers');

-- Apenas usuários aprovados podem fazer upload/editar/excluir capas
CREATE POLICY "Approved users upload course covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-covers' AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users update course covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-covers' AND public.is_approved(auth.uid()))
WITH CHECK (bucket_id = 'course-covers' AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users delete course covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-covers' AND public.is_approved(auth.uid()));