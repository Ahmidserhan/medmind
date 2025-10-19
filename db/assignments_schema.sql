-- Assignments Schema for MedMind
-- Run this in Supabase SQL Editor

-- 1) Assignments table
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date not null,
  status text not null check (status in ('Not Started', 'In Progress', 'Done')),
  priority text not null check (priority in ('Low', 'Medium', 'High')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Assignment attachments table
create table if not exists public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  type text not null check (type in ('file', 'link', 'note')),
  name text not null,
  content text not null, -- URL for files/links, text for notes
  created_at timestamptz not null default now()
);

-- 3) Indexes for performance
create index if not exists assignments_user_id_idx on public.assignments(user_id);
create index if not exists assignments_due_date_idx on public.assignments(due_date);
create index if not exists assignments_status_idx on public.assignments(status);
create index if not exists assignments_priority_idx on public.assignments(priority);
create index if not exists assignment_attachments_assignment_id_idx on public.assignment_attachments(assignment_id);

-- 4) Updated_at trigger for assignments
create or replace function public.assignments_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.assignments_set_updated_at();

-- 5) RLS policies for assignments
alter table public.assignments enable row level security;

drop policy if exists "assignments_select_own" on public.assignments;
create policy "assignments_select_own"
  on public.assignments for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "assignments_insert_own" on public.assignments;
create policy "assignments_insert_own"
  on public.assignments for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "assignments_update_own" on public.assignments;
create policy "assignments_update_own"
  on public.assignments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "assignments_delete_own" on public.assignments;
create policy "assignments_delete_own"
  on public.assignments for delete
  to authenticated
  using (user_id = auth.uid());

-- 6) RLS policies for attachments
alter table public.assignment_attachments enable row level security;

drop policy if exists "attachments_select_own" on public.assignment_attachments;
create policy "attachments_select_own"
  on public.assignment_attachments for select
  to authenticated
  using (
    assignment_id in (
      select id from public.assignments where user_id = auth.uid()
    )
  );

drop policy if exists "attachments_insert_own" on public.assignment_attachments;
create policy "attachments_insert_own"
  on public.assignment_attachments for insert
  to authenticated
  with check (
    assignment_id in (
      select id from public.assignments where user_id = auth.uid()
    )
  );

drop policy if exists "attachments_update_own" on public.assignment_attachments;
create policy "attachments_update_own"
  on public.assignment_attachments for update
  to authenticated
  using (
    assignment_id in (
      select id from public.assignments where user_id = auth.uid()
    )
  )
  with check (
    assignment_id in (
      select id from public.assignments where user_id = auth.uid()
    )
  );

drop policy if exists "attachments_delete_own" on public.assignment_attachments;
create policy "attachments_delete_own"
  on public.assignment_attachments for delete
  to authenticated
  using (
    assignment_id in (
      select id from public.assignments where user_id = auth.uid()
    )
  );

-- 7) Helper view for assignments with attachments
create or replace view public.user_assignments_with_attachments as
select 
  a.id,
  a.user_id,
  a.title,
  a.due_date,
  a.status,
  a.priority,
  a.notes,
  a.created_at,
  a.updated_at,
  coalesce(
    json_agg(
      json_build_object(
        'id', att.id,
        'type', att.type,
        'name', att.name,
        'content', att.content,
        'created_at', att.created_at
      ) order by att.created_at
    ) filter (where att.id is not null),
    '[]'::json
  ) as attachments
from public.assignments a
left join public.assignment_attachments att on att.assignment_id = a.id
where a.user_id = auth.uid()
group by a.id, a.user_id, a.title, a.due_date, a.status, a.priority, a.notes, a.created_at, a.updated_at;
