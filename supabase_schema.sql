-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.assignment_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['file'::text, 'link'::text, 'note'::text])),
  name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assignment_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_attachments_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id)
);
CREATE TABLE public.assignment_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignment_comments_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_comments_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT assignment_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['Not Started'::text, 'In Progress'::text, 'Done'::text])),
  priority text NOT NULL CHECK (priority = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['lecture'::text, 'clinical'::text, 'exam'::text, 'other'::text])),
  location text,
  description text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern text,
  recurrence_end_date date,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.clinical_preceptors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  title text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinical_preceptors_pkey PRIMARY KEY (id),
  CONSTRAINT clinical_preceptors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.clinical_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  shift_type text NOT NULL CHECK (shift_type = ANY (ARRAY['AM'::text, 'PM'::text, 'Night'::text])),
  site text NOT NULL,
  department text NOT NULL,
  preceptor_id uuid NOT NULL,
  hours_logged integer NOT NULL CHECK (hours_logged >= 1 AND hours_logged <= 24),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinical_shifts_pkey PRIMARY KEY (id),
  CONSTRAINT clinical_shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT clinical_shifts_preceptor_id_fkey FOREIGN KEY (preceptor_id) REFERENCES public.clinical_preceptors(id)
);
CREATE TABLE public.collab_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['session'::text, 'thread'::text])),
  target_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  file_size bigint CHECK (file_size IS NULL OR file_size > 0 AND file_size <= 52428800),
  file_type text,
  CONSTRAINT collab_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT collab_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT collab_message_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT collab_message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.collab_messages(id),
  CONSTRAINT collab_message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  image_path text,
  CONSTRAINT collab_messages_pkey PRIMARY KEY (id),
  CONSTRAINT collab_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collab_sessions(id),
  CONSTRAINT collab_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_session_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collab_session_comments_pkey PRIMARY KEY (id),
  CONSTRAINT collab_session_comments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collab_sessions(id),
  CONSTRAINT collab_session_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_session_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collab_session_participants_pkey PRIMARY KEY (id),
  CONSTRAINT collab_session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collab_sessions(id),
  CONSTRAINT collab_session_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_session_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  value integer NOT NULL DEFAULT 1,
  CONSTRAINT collab_session_votes_pkey PRIMARY KEY (id),
  CONSTRAINT collab_session_votes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collab_sessions(id),
  CONSTRAINT collab_session_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'public'::text CHECK (visibility = ANY (ARRAY['public'::text, 'private'::text])),
  access_code text,
  scheduled_at timestamp with time zone,
  duration_mins integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collab_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT collab_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_thread_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collab_thread_replies_pkey PRIMARY KEY (id),
  CONSTRAINT collab_thread_replies_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.collab_threads(id),
  CONSTRAINT collab_thread_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_thread_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  user_id uuid NOT NULL,
  value integer NOT NULL DEFAULT 1,
  CONSTRAINT collab_thread_votes_pkey PRIMARY KEY (id),
  CONSTRAINT collab_thread_votes_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.collab_threads(id),
  CONSTRAINT collab_thread_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.collab_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collab_threads_pkey PRIMARY KEY (id),
  CONSTRAINT collab_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.custom_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_type text NOT NULL CHECK (category_type = ANY (ARRAY['assignment'::text, 'exam'::text, 'clinical'::text, 'note'::text, 'general'::text])),
  name text NOT NULL,
  color text DEFAULT '#0F3D73'::text,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_categories_pkey PRIMARY KEY (id),
  CONSTRAINT custom_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.custom_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label_type text NOT NULL CHECK (label_type = ANY (ARRAY['assignment'::text, 'exam'::text, 'clinical'::text, 'general'::text])),
  name text NOT NULL,
  color text DEFAULT '#3AAFA9'::text,
  icon text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT custom_labels_pkey PRIMARY KEY (id),
  CONSTRAINT custom_labels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.exam_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_comments_pkey PRIMARY KEY (id),
  CONSTRAINT exam_comments_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT exam_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  time time without time zone,
  location text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.glossary_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  term_type text NOT NULL CHECK (term_type = ANY (ARRAY['drug'::text, 'procedure'::text, 'abbreviation'::text, 'custom'::text])),
  term text NOT NULL,
  definition text NOT NULL,
  notes text,
  source text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT glossary_terms_pkey PRIMARY KEY (id),
  CONSTRAINT glossary_terms_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.pomodoro_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode = ANY (ARRAY['work'::text, 'break'::text])),
  started_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  minutes integer NOT NULL CHECK (minutes > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pomodoro_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT pomodoro_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  school text,
  bio text,
  avatar_url text,
  email_notifications boolean NOT NULL DEFAULT false,
  theme text NOT NULL DEFAULT 'light'::text CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.shared_calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['session'::text, 'assignment'::text, 'exam'::text, 'custom'::text])),
  reference_id uuid,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  color text DEFAULT '#0F3D73'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shared_calendar_events_pkey PRIMARY KEY (id),
  CONSTRAINT shared_calendar_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collab_sessions(id)
);
CREATE TABLE public.shared_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  assigned_to uuid,
  due_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shared_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT shared_tasks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.collab_sessions(id),
  CONSTRAINT shared_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT shared_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
);
CREATE TABLE public.study_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  tags ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_notes_pkey PRIMARY KEY (id),
  CONSTRAINT study_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.task_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.shared_tasks(id),
  CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.todos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT todos_pkey PRIMARY KEY (id),
  CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  theme text DEFAULT 'neutral'::text CHECK (theme = ANY (ARRAY['neutral'::text, 'minimalist'::text, 'light'::text, 'dark'::text])),
  font_style text DEFAULT 'inter'::text CHECK (font_style = ANY (ARRAY['inter'::text, 'roboto'::text, 'open-sans'::text, 'lato'::text, 'poppins'::text])),
  text_size text DEFAULT 'medium'::text CHECK (text_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text, 'extra-large'::text])),
  primary_color text DEFAULT '#0F3D73'::text,
  secondary_color text DEFAULT '#3AAFA9'::text,
  accent_color text DEFAULT '#2E3A59'::text,
  background_color text DEFAULT '#F9FAFB'::text,
  text_color text DEFAULT '#2E3A59'::text,
  dashboard_layout jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);