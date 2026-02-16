ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS error_message text;