-- Run in Supabase SQL editor
-- Collaboration schema: sessions (group planning) and discussion threads

-- 1) Group Planning Sessions
create table if not exists public.collab_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, -- owner
  title text not null,
  description text,
  visibility text not null check (visibility in ('public','private')) default 'public',
  access_code text, -- optional code for joining private sessions
  scheduled_at timestamptz,
  duration_mins int,
  created_at timestamptz not null default now()
);

create table if not exists public.collab_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.collab_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz not null default now(),
  unique(session_id, user_id)
);

create table if not exists public.collab_session_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.collab_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.collab_session_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.collab_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value int not null default 1,
  unique(session_id, user_id)
);

-- 2) Discussion Threads
create table if not exists public.collab_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.collab_thread_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.collab_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.collab_thread_votes (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.collab_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value int not null default 1,
  unique(thread_id, user_id)
);

-- Indexes
create index if not exists collab_sessions_user_id_idx on public.collab_sessions(user_id);
create index if not exists collab_session_participants_session_id_idx on public.collab_session_participants(session_id);
create index if not exists collab_session_comments_session_id_idx on public.collab_session_comments(session_id);
create index if not exists collab_threads_user_id_idx on public.collab_threads(user_id);
create index if not exists collab_thread_replies_thread_id_idx on public.collab_thread_replies(thread_id);

-- Row Level Security
alter table public.collab_sessions enable row level security;
alter table public.collab_session_participants enable row level security;
alter table public.collab_session_comments enable row level security;
alter table public.collab_session_votes enable row level security;
alter table public.collab_threads enable row level security;
alter table public.collab_thread_replies enable row level security;
alter table public.collab_thread_votes enable row level security;

-- Sessions RLS: authenticated can read public sessions, their own sessions, or sessions they joined
create policy if not exists collab_sessions_select on public.collab_sessions
for select to authenticated using (
  visibility = 'public' or user_id = auth.uid() or exists(
    select 1 from public.collab_session_participants p where p.session_id = id and p.user_id = auth.uid()
  )
);
create policy if not exists collab_sessions_insert on public.collab_sessions
for insert to authenticated with check (user_id = auth.uid());
create policy if not exists collab_sessions_update on public.collab_sessions
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists collab_sessions_delete on public.collab_sessions
for delete to authenticated using (user_id = auth.uid());

-- Participants RLS: user can see own participant rows for readable sessions; can insert themselves
create policy if not exists collab_participants_select on public.collab_session_participants
for select to authenticated using (user_id = auth.uid());
create policy if not exists collab_participants_insert on public.collab_session_participants
for insert to authenticated with check (user_id = auth.uid());
create policy if not exists collab_participants_delete on public.collab_session_participants
for delete to authenticated using (user_id = auth.uid());

-- Comments RLS: visible if their session is visible by sessions policy; creator can insert/update/delete
create policy if not exists collab_comments_select on public.collab_session_comments
for select to authenticated using (exists (
  select 1 from public.collab_sessions s where s.id = session_id and (
    s.visibility = 'public' or s.user_id = auth.uid() or exists(
      select 1 from public.collab_session_participants p where p.session_id = s.id and p.user_id = auth.uid()
    )
  )
));
create policy if not exists collab_comments_insert on public.collab_session_comments
for insert to authenticated with check (user_id = auth.uid());
create policy if not exists collab_comments_update on public.collab_session_comments
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists collab_comments_delete on public.collab_session_comments
for delete to authenticated using (user_id = auth.uid());

-- Votes RLS: user manages own vote rows
create policy if not exists collab_session_votes_rw on public.collab_session_votes
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Threads RLS: all authenticated users can read; owners can modify
create policy if not exists collab_threads_select on public.collab_threads
for select to authenticated using (true);
create policy if not exists collab_threads_insert on public.collab_threads
for insert to authenticated with check (user_id = auth.uid());
create policy if not exists collab_threads_update on public.collab_threads
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists collab_threads_delete on public.collab_threads
for delete to authenticated using (user_id = auth.uid());

-- Replies RLS: readable to all; creators can modify
create policy if not exists collab_replies_select on public.collab_thread_replies
for select to authenticated using (true);
create policy if not exists collab_replies_insert on public.collab_thread_replies
for insert to authenticated with check (user_id = auth.uid());
create policy if not exists collab_replies_update on public.collab_thread_replies
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists collab_replies_delete on public.collab_thread_replies
for delete to authenticated using (user_id = auth.uid());

-- Thread votes RLS: user manages own vote rows
create policy if not exists collab_thread_votes_rw on public.collab_thread_votes
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Attachments (for sessions or threads) stored in Supabase Storage, this table tracks metadata
create table if not exists public.collab_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('session','thread')),
  target_id uuid not null, -- references session id or thread id (not FK to allow union)
  name text not null,
  path text not null, -- storage path in bucket 'collab'
  url text, -- optional public URL
  created_at timestamptz not null default now()
);

create index if not exists collab_attachments_target_idx on public.collab_attachments(kind, target_id);
alter table public.collab_attachments enable row level security;
create policy if not exists collab_attachments_rw on public.collab_attachments
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Helper views for scores and counts (optional)
create or replace view public.collab_session_scores as
select s.id as session_id, coalesce(sum(v.value),0) as score
from public.collab_sessions s
left join public.collab_session_votes v on v.session_id = s.id
group by s.id;

create or replace view public.collab_thread_scores as
select t.id as thread_id, coalesce(sum(v.value),0) as score
from public.collab_threads t
left join public.collab_thread_votes v on v.thread_id = t.id
group by t.id;
