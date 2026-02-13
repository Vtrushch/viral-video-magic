
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS analysis_result jsonb;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds integer;

ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE public.clips ADD COLUMN IF NOT EXISTS viral_analysis jsonb;
