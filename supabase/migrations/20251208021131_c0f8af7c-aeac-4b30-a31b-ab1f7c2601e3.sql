-- Add storage policies for the topbus bucket to allow public uploads
-- While keeping read/delete restricted to authenticated users

-- First, remove any existing policies that might conflict
DROP POLICY IF EXISTS "Allow public uploads to topbus" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from topbus" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from topbus" ON storage.objects;

-- Allow anyone (including anonymous/unauthenticated users) to upload files to topbus bucket
CREATE POLICY "Allow public uploads to topbus"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'topbus');

-- Only authenticated users can read files from topbus bucket
CREATE POLICY "Allow authenticated read from topbus"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'topbus');

-- Only authenticated users can delete files from topbus bucket
CREATE POLICY "Allow authenticated delete from topbus"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'topbus');