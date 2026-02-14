ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS render_started_at timestamptz;

ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS render_completed_at timestamptz;

ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS transcription text;

ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS transcription_words jsonb;

ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS caption_style text DEFAULT 'hormozi';