
-- FIX A: raw-videos owner-scoped UPDATE/DELETE
CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'raw-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- FIX B: thumbnails public read; no end-user writes
CREATE POLICY "Public thumbnail read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'thumbnails');

-- FIX C: lock down SECURITY DEFINER RPCs (keep authenticated execute)
ALTER FUNCTION public.increment_used_credits(uuid) SET search_path = public;
ALTER FUNCTION public.increment_used_credits(uuid, integer) SET search_path = public;
ALTER FUNCTION public.count_uploads_this_period(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.increment_used_credits(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_used_credits(uuid, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.count_uploads_this_period(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_used_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_used_credits(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_uploads_this_period(uuid) TO authenticated;
