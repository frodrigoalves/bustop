-- Tornar o bucket topbus público para que getPublicUrl funcione
UPDATE storage.buckets SET public = true WHERE id = 'topbus';

-- Remover política duplicada
DROP POLICY IF EXISTS "Allow public upload to topbus" ON storage.objects;