-- Calendar Events Schema for MedMind
-- Run this in Supabase SQL Editor

-- 1) Calendar events table
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  time time not null,
  end_time time not null,
  type text not null check (type in ('lecture', 'clinical', 'exam', 'other')),
  location text,
  description text,
  is_recurring boolean not null default false,
  recurrence_pattern text, -- 'daily', 'weekly', 'monthly', etc.
  recurrence_end_date date,
  color text, -- hex color for custom event colors
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Indexes for performance
create index if not exists calendar_events_user_id_idx on public.calendar_events(user_id);
create index if not exists calendar_events_date_idx on public.calendar_events(date);
create index if not exists calendar_events_type_idx on public.calendar_events(type);

-- 3) Updated_at trigger
create or replace function public.calendar_events_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.calendar_events_set_updated_at();

-- 4) RLS policies
alter table public.calendar_events enable row level security;

-- Users can select only their own events
drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own"
  on public.calendar_events for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own events
drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own"
  on public.calendar_events for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update only their own events
drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own"
  on public.calendar_events for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete only their own events
drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own"
  on public.calendar_events for delete
  to authenticated
  using (user_id = auth.uid());

-- 5) Helper view for events with date range filtering
create or replace view public.user_calendar_events as
select 
  e.id,
  e.user_id,
  e.title,
  e.date,
  e.time,
  e.end_time,
  e.type,
  e.location,
  e.description,
  e.is_recurring,
  e.recurrence_pattern,
  e.recurrence_end_date,
  e.color,
  e.created_at,
  e.updated_at
from public.calendar_events e
where e.user_id = auth.uid();
