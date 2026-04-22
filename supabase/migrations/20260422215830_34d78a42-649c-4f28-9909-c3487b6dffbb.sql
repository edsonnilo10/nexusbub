
-- A) Fecha auto-aprovação em profiles
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND approved = (SELECT p.approved FROM public.profiles p WHERE p.id = auth.uid())
);

-- B) Remove policies duplicadas/frouxas do bucket course-covers
DROP POLICY IF EXISTS "Authenticated upload course covers" ON storage.objects;
DROP POLICY IF EXISTS "Owner update course covers" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete course covers" ON storage.objects;

-- C) Restringe listagem do bucket (mantém leitura pública individual via URL anon)
DROP POLICY IF EXISTS "Authenticated read course covers" ON storage.objects;
