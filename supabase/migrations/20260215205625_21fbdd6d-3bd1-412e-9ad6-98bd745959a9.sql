INSERT INTO storage.buckets (id, name, public) VALUES ('rendered-clips', 'rendered-clips', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read rendered clips" ON storage.objects FOR SELECT USING (bucket_id = 'rendered-clips');

CREATE POLICY "Service role upload rendered clips" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rendered-clips');

CREATE POLICY "Service role update rendered clips" ON storage.objects FOR UPDATE USING (bucket_id = 'rendered-clips');