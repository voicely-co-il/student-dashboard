-- Add source_content column to store the original text
ALTER TABLE notebooklm_content
ADD COLUMN IF NOT EXISTS source_content TEXT;

-- Create storage bucket for NotebookLM generated content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notebooklm-content',
  'notebooklm-content',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "Admins can upload notebooklm content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notebooklm-content'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update notebooklm content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'notebooklm-content'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete notebooklm content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notebooklm-content'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view notebooklm content"
ON storage.objects FOR SELECT
USING (bucket_id = 'notebooklm-content');
