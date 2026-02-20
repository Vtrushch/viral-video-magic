-- Allow users to update their own clips (for Remix Mode save)
CREATE POLICY "Users can update own clips" 
  ON public.clips FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also allow admin to update any clips
CREATE POLICY "Admin can update all clips"
  ON public.clips FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));