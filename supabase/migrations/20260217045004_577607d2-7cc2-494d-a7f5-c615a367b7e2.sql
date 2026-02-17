-- Atomic credit increment function
CREATE OR REPLACE FUNCTION public.increment_used_credits(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_credits
  SET used_credits = used_credits + 1, updated_at = now()
  WHERE user_id = _user_id;
END;
$$;