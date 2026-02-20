-- Remove dangerous UPDATE policy on user_credits
DROP POLICY IF EXISTS "Users can update own used_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update used_credits" ON public.user_credits;

-- Ensure the increment_used_credits function is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.increment_used_credits(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits 
  SET used_credits = used_credits + 1, updated_at = now()
  WHERE user_id = _user_id;
END;
$$;