CREATE OR REPLACE FUNCTION public.increment_used_credits(p_user_id UUID, p_amount INT DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_credits
  SET used_credits = used_credits + p_amount, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;