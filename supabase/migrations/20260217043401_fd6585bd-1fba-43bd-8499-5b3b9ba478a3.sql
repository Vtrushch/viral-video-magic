
-- Add credits_used column to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS credits_used integer DEFAULT 0;

-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  total_credits integer DEFAULT 0,
  used_credits integer DEFAULT 0,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update credits" ON public.user_credits
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert credits" ON public.user_credits
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow users to update their own used_credits (for spending)
CREATE POLICY "Users can update own used_credits" ON public.user_credits
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create credits row for new users (3 free credits)
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, total_credits, used_credits, plan)
  VALUES (NEW.id, 3, 0, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Create credits row for existing users
INSERT INTO public.user_credits (user_id, total_credits, used_credits, plan)
SELECT DISTINCT user_id, 3, 0, 'free' FROM public.videos
ON CONFLICT (user_id) DO NOTHING;
