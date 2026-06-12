-- Content Calendar: scheduled clip publications
-- v1 = planning + email reminders; columns for direct API publishing (phase 2) included.

CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id uuid REFERENCES public.clips(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT 'tiktok',          -- tiktok | instagram | youtube | facebook | twitter | linkedin
  scheduled_at timestamptz NOT NULL,
  caption text,
  status text NOT NULL DEFAULT 'scheduled',          -- scheduled | published | missed | canceled
  reminder_sent boolean NOT NULL DEFAULT false,
  external_post_id text,                             -- phase 2: id returned by platform API
  publish_error text,                                -- phase 2: last publish failure
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled posts"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_time
  ON public.scheduled_posts (user_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due
  ON public.scheduled_posts (status, reminder_sent, scheduled_at);

CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
