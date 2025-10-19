-- Create message reactions table
CREATE TABLE IF NOT EXISTS public.collab_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.collab_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_collab_message_reactions_message_id ON public.collab_message_reactions(message_id);
CREATE INDEX idx_collab_message_reactions_user_id ON public.collab_message_reactions(user_id);

ALTER TABLE public.collab_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collab_reactions_select ON public.collab_message_reactions;
CREATE POLICY collab_reactions_select ON public.collab_message_reactions
  FOR SELECT TO authenticated
  USING (
    message_id IN (
      SELECT id FROM public.collab_messages
      WHERE session_id IN (
        SELECT session_id FROM public.collab_session_participants
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS collab_reactions_insert ON public.collab_message_reactions;
CREATE POLICY collab_reactions_insert ON public.collab_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS collab_reactions_delete ON public.collab_message_reactions;
CREATE POLICY collab_reactions_delete ON public.collab_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add image_url column to collab_messages for inline images
ALTER TABLE public.collab_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.collab_messages ADD COLUMN IF NOT EXISTS image_path text;
