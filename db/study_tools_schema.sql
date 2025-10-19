-- Study Tools schema (idempotent policies via DO blocks)

-- 1) Todos
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null check (status in ('pending','in_progress','completed')) default 'pending',
  priority text not null check (priority in ('low','medium','high')) default 'medium',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todos_user_id_idx on public.todos(user_id);
create index if not exists todos_status_idx on public.todos(status);
create index if not exists todos_priority_idx on public.todos(priority);

create or replace function public.todos_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
before update on public.todos
for each row execute function public.todos_set_updated_at();

alter table public.todos enable row level security;

-- RLS policies (create if missing)
-- SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='todos' AND policyname='todos_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY todos_select_own
      ON public.todos
      FOR SELECT
      TO authenticated
      USING ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
-- INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='todos' AND policyname='todos_insert_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY todos_insert_own
      ON public.todos
      FOR INSERT
      TO authenticated
      WITH CHECK ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
-- UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='todos' AND policyname='todos_update_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY todos_update_own
      ON public.todos
      FOR UPDATE
      TO authenticated
      USING ((user_id = auth.uid()))
      WITH CHECK ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
-- DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='todos' AND policyname='todos_delete_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY todos_delete_own
      ON public.todos
      FOR DELETE
      TO authenticated
      USING ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;


-- 2) Notes
create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_notes_user_id_idx on public.study_notes(user_id);
create index if not exists study_notes_tags_idx on public.study_notes using gin(tags);

create or replace function public.study_notes_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists study_notes_set_updated_at on public.study_notes;
create trigger study_notes_set_updated_at
before update on public.study_notes
for each row execute function public.study_notes_set_updated_at();

alter table public.study_notes enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='study_notes' AND policyname='study_notes_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY study_notes_select_own
      ON public.study_notes
      FOR SELECT
      TO authenticated
      USING ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='study_notes' AND policyname='study_notes_insert_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY study_notes_insert_own
      ON public.study_notes
      FOR INSERT
      TO authenticated
      WITH CHECK ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='study_notes' AND policyname='study_notes_update_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY study_notes_update_own
      ON public.study_notes
      FOR UPDATE
      TO authenticated
      USING ((user_id = auth.uid()))
      WITH CHECK ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='study_notes' AND policyname='study_notes_delete_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY study_notes_delete_own
      ON public.study_notes
      FOR DELETE
      TO authenticated
      USING ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;


-- 3) Pomodoro sessions
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('work','break')),
  started_at timestamptz not null,
  ended_at timestamptz,
  minutes int not null check (minutes > 0),
  created_at timestamptz not null default now()
);

create index if not exists pomodoro_sessions_user_id_idx on public.pomodoro_sessions(user_id);
create index if not exists pomodoro_sessions_started_idx on public.pomodoro_sessions(started_at);

alter table public.pomodoro_sessions enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pomodoro_sessions' AND policyname='pomodoro_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY pomodoro_select_own
      ON public.pomodoro_sessions
      FOR SELECT
      TO authenticated
      USING ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pomodoro_sessions' AND policyname='pomodoro_insert_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY pomodoro_insert_own
      ON public.pomodoro_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pomodoro_sessions' AND policyname='pomodoro_delete_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY pomodoro_delete_own
      ON public.pomodoro_sessions
      FOR DELETE
      TO authenticated
      USING ((user_id = auth.uid()));
    $policy$;
  END IF;
END
$$;