ALTER TABLE public.highlight_reels ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.highlight_reels ADD COLUMN IF NOT EXISTS ai_plan JSONB;