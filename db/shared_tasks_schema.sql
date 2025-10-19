-- Shared Tasks and Comments Schema

-- Shared tasks for collaboration
CREATE TABLE IF NOT EXISTS public.shared_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shared_tasks_session_id ON public.shared_tasks(session_id);
CREATE INDEX idx_shared_tasks_assigned_to ON public.shared_tasks(assigned_to);
CREATE INDEX idx_shared_tasks_status ON public.shared_tasks(status);

-- Task comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.shared_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

-- Assignment comments (for shared calendar integration)
CREATE TABLE IF NOT EXISTS public.assignment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_assignment_comments_assignment_id ON public.assignment_comments(assignment_id);
CREATE INDEX idx_assignment_comments_user_id ON public.assignment_comments(user_id);

-- Exam comments (for shared calendar integration)
CREATE TABLE IF NOT EXISTS public.exam_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exam_comments_exam_id ON public.exam_comments(exam_id);
CREATE INDEX idx_exam_comments_user_id ON public.exam_comments(user_id);

-- Shared calendar events (link sessions to calendar)
CREATE TABLE IF NOT EXISTS public.shared_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.collab_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('session', 'assignment', 'exam', 'custom')),
  reference_id uuid,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  color text DEFAULT '#0F3D73',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shared_calendar_events_session_id ON public.shared_calendar_events(session_id);
CREATE INDEX idx_shared_calendar_events_start_time ON public.shared_calendar_events(start_time);

-- Enable RLS
ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_tasks
DROP POLICY IF EXISTS shared_tasks_select ON public.shared_tasks;
CREATE POLICY shared_tasks_select ON public.shared_tasks
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shared_tasks_insert ON public.shared_tasks;
CREATE POLICY shared_tasks_insert ON public.shared_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    session_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shared_tasks_update ON public.shared_tasks;
CREATE POLICY shared_tasks_update ON public.shared_tasks
  FOR UPDATE TO authenticated
  USING (
    session_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shared_tasks_delete ON public.shared_tasks;
CREATE POLICY shared_tasks_delete ON public.shared_tasks
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for task_comments
DROP POLICY IF EXISTS task_comments_select ON public.task_comments;
CREATE POLICY task_comments_select ON public.task_comments
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM public.shared_tasks
      WHERE session_id IN (
        SELECT session_id FROM public.collab_session_participants
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS task_comments_insert ON public.task_comments;
CREATE POLICY task_comments_insert ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS task_comments_delete ON public.task_comments;
CREATE POLICY task_comments_delete ON public.task_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for assignment_comments
DROP POLICY IF EXISTS assignment_comments_select ON public.assignment_comments;
CREATE POLICY assignment_comments_select ON public.assignment_comments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS assignment_comments_insert ON public.assignment_comments;
CREATE POLICY assignment_comments_insert ON public.assignment_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS assignment_comments_delete ON public.assignment_comments;
CREATE POLICY assignment_comments_delete ON public.assignment_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for exam_comments
DROP POLICY IF EXISTS exam_comments_select ON public.exam_comments;
CREATE POLICY exam_comments_select ON public.exam_comments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS exam_comments_insert ON public.exam_comments;
CREATE POLICY exam_comments_insert ON public.exam_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exam_comments_delete ON public.exam_comments;
CREATE POLICY exam_comments_delete ON public.exam_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for shared_calendar_events
DROP POLICY IF EXISTS shared_calendar_events_select ON public.shared_calendar_events;
CREATE POLICY shared_calendar_events_select ON public.shared_calendar_events
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shared_calendar_events_insert ON public.shared_calendar_events;
CREATE POLICY shared_calendar_events_insert ON public.shared_calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT session_id FROM public.collab_session_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shared_calendar_events_delete ON public.shared_calendar_events;
CREATE POLICY shared_calendar_events_delete ON public.shared_calendar_events
  FOR DELETE TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM public.collab_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE shared_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_calendar_events;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_shared_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shared_tasks_updated_at ON public.shared_tasks;
CREATE TRIGGER shared_tasks_updated_at
  BEFORE UPDATE ON public.shared_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_tasks_updated_at();
