-- Add storage policies for 'topbus' bucket to control file access
-- Allow anyone to upload files (needed for public incident submission form)
CREATE POLICY "Allow public upload to topbus"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'topbus');

-- Allow authenticated users to read files (managers viewing incident photos/documents)
CREATE POLICY "Allow authenticated read from topbus"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'topbus');

-- Allow authenticated users to delete files (for management purposes)
CREATE POLICY "Allow authenticated delete from topbus"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'topbus');