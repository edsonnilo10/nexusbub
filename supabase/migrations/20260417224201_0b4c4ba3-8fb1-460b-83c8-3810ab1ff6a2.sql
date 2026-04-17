-- Substitui as policies de escrita do bucket course-covers
-- por versões com checagem de "dono do arquivo".
-- Convenção: arquivos vão em "{auth.uid()}/nome-aleatorio.ext"

DROP POLICY IF EXISTS "Authenticated upload course covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update course covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete course covers" ON storage.objects;

CREATE POLICY "Authenticated upload course covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner update course covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'course-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner delete course covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );