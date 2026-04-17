-- Remove policies antigas amplas que estavam duplicando as policies "Owner ..."
DROP POLICY IF EXISTS "Auth upload course covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth update course covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete course covers" ON storage.objects;