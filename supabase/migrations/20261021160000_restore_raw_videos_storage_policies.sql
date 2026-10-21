-- Restore owner-scoped RLS policies on storage.objects for the PRIVATE
-- `raw-videos` bucket.
--
-- These were defined in 20260209220818 (SELECT/INSERT) and 20260619222313
-- (UPDATE/DELETE) but did NOT carry over to the migrated Supabase project
-- (hookcut-prod). Without the SELECT policy, an authenticated user's
-- storage.createSignedUrl('raw-videos', ...) is denied and returns
-- "Object not found", which broke EVERY unrendered-clip preview and edit
-- (frontend showed "Failed to load video"). Buckets + data migrated; the
-- storage.objects policies did not. Idempotent (safe to re-run / re-push).

-- SELECT — required for createSignedUrl (clip preview + editor read the source)
DROP POLICY IF EXISTS "Users can view own videos" ON storage.objects;
CREATE POLICY "Users can view own videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- INSERT — direct browser "Upload File" tab writes to raw-videos
DROP POLICY IF EXISTS "Users can upload own videos" ON storage.objects;
CREATE POLICY "Users can upload own videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- UPDATE — owner-scoped (re-upload / overwrite own source)
DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DELETE — owner-scoped (remove own source)
DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
