
CREATE TABLE IF NOT EXISTS public.highlight_reels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'My Highlight Reel',
  clip_ids uuid[] NOT NULL DEFAULT '{}',
  clip_order integer[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  file_path text,
  duration_seconds integer,
  caption_style text NOT NULL DEFAULT 'hormozi',
  add_transitions boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  rendered_at timestamptz
);

ALTER TABLE public.highlight_reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reels" ON public.highlight_reels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reels" ON public.highlight_reels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reels" ON public.highlight_reels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reels" ON public.highlight_reels
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all reels" ON public.highlight_reels
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
