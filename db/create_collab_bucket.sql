-- Create the collab-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collab-files',
  'collab-files',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage policies for collab-files bucket
DROP POLICY IF EXISTS "Public can view collab files" ON storage.objects;
CREATE POLICY "Public can view collab files"
ON storage.objects FOR SELECT
USING (bucket_id = 'collab-files');

DROP POLICY IF EXISTS "Authenticated users can upload collab files" ON storage.objects;
CREATE POLICY "Authenticated users can upload collab files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'collab-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own collab files" ON storage.objects;
CREATE POLICY "Users can update their own collab files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'collab-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own collab files" ON storage.objects;
CREATE POLICY "Users can delete their own collab files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'collab-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add file size and type columns to existing collab_attachments table
ALTER TABLE public.collab_attachments ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE public.collab_attachments ADD COLUMN IF NOT EXISTS file_type text;

-- Add file size constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_file_size'
  ) THEN
    ALTER TABLE public.collab_attachments ADD CONSTRAINT valid_file_size 
      CHECK (file_size IS NULL OR (file_size > 0 AND file_size <= 52428800));
  END IF;
END $$;

-- Update RLS policies for collab_attachments
DROP POLICY IF EXISTS collab_attachments_rw ON public.collab_attachments;

DROP POLICY IF EXISTS collab_attachments_select_session ON public.collab_attachments;
CREATE POLICY collab_attachments_select_session ON public.collab_attachments
  FOR SELECT TO authenticated
  USING (
    kind = 'session' AND
    target_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS collab_attachments_insert_session ON public.collab_attachments;
CREATE POLICY collab_attachments_insert_session ON public.collab_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    kind = 'session' AND
    target_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS collab_attachments_delete_own ON public.collab_attachments;
CREATE POLICY collab_attachments_delete_own ON public.collab_attachments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
