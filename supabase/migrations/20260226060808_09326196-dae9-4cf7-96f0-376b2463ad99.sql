
-- Fix: Remove deleted_at filter from SELECT policy
-- The deleted_at IS NULL check causes UPDATE (soft-delete) to fail
-- because the updated row becomes invisible to the user
DROP POLICY IF EXISTS "Users can view own videos or admin" ON public.videos;
CREATE POLICY "Users can view own videos or admin"
  ON public.videos
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  );
