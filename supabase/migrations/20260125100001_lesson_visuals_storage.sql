-- Storage bucket for lesson visual images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-visuals',
  'lesson-visuals',
  true, -- Public bucket for easy access
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view lesson visuals"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'lesson-visuals');

CREATE POLICY "Authenticated users can upload lesson visuals"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-visuals'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admins can delete lesson visuals"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'lesson-visuals'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
