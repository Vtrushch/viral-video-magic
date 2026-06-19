
-- FIX 3: Storage hardening for rendered-clips & thumbnails
-- Drop user-facing INSERT/SELECT policies. Buckets remain public so direct
-- object URLs still serve files; removing the SELECT policy prevents API listing.
DROP POLICY IF EXISTS "Public read rendered clips" ON storage.objects;
DROP POLICY IF EXISTS "Public thumbnail access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload thumbnails" ON storage.objects;

-- FIX 2: Revoke EXECUTE on SECURITY DEFINER trigger-only functions.
-- Triggers still fire (they run as the table owner), but clients can't call them via RPC.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_credits() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
