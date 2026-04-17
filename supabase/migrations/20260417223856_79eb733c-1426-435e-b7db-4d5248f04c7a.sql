-- Marca o bucket como NÃO público para impedir listagem.
-- URLs diretas continuam funcionando porque vamos servi-las como signed URLs OU
-- mantendo leitura pública por bucket_id (já existe a policy "Public read course covers"
-- que retorna o objeto quando se conhece o caminho exato).
-- A flag `public` é o que controla a operação de listagem anônima.
UPDATE storage.buckets
SET public = false
WHERE id = 'course-covers';