CREATE TABLE IF NOT EXISTS public.collab_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_collab_messages_session_id ON public.collab_messages(session_id);
CREATE INDEX idx_collab_messages_created_at ON public.collab_messages(created_at);

ALTER TABLE public.collab_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collab_messages_select ON public.collab_messages;
CREATE POLICY collab_messages_select ON public.collab_messages
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS collab_messages_insert ON public.collab_messages;
CREATE POLICY collab_messages_insert ON public.collab_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    session_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

ALTER TABLE public.collab_attachments ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE public.collab_attachments ADD COLUMN IF NOT EXISTS file_type text;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_file_size'
  ) THEN
    ALTER TABLE public.collab_attachments ADD CONSTRAINT valid_file_size 
      CHECK (file_size IS NULL OR (file_size > 0 AND file_size <= 52428800));
  END IF;
END $$;

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

INSERT INTO storage.buckets (id, name, public)
VALUES ('collab-files', 'collab-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload collab files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'collab-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view collab files they have access to"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'collab-files' AND
  (storage.foldername(name))[2] IN (
    SELECT session_id::text FROM public.collab_session_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own collab files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'collab-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
