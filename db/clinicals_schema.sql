-- Run this in Supabase SQL editor
-- Clinicals schema: preceptors + shifts with RLS

-- 1) Tables
create table if not exists public.clinical_preceptors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.clinical_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  shift_type text not null check (shift_type in ('AM','PM','Night')),
  site text not null,
  department text not null,
  preceptor_id uuid not null references public.clinical_preceptors(id) on delete restrict,
  hours_logged integer not null check (hours_logged between 1 and 24),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Indexes
create index if not exists clinical_preceptors_user_id_idx on public.clinical_preceptors(user_id);
create index if not exists clinical_shifts_user_id_idx on public.clinical_shifts(user_id);
create index if not exists clinical_shifts_date_idx on public.clinical_shifts(date);
create index if not exists clinical_shifts_preceptor_id_idx on public.clinical_shifts(preceptor_id);

-- 3) updated_at trigger
create or replace function public.clinical_shifts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists clinical_shifts_set_updated_at on public.clinical_shifts;
create trigger clinical_shifts_set_updated_at
before update on public.clinical_shifts
for each row execute function public.clinical_shifts_set_updated_at();

-- 4) Row Level Security
alter table public.clinical_preceptors enable row level security;
alter table public.clinical_shifts enable row level security;

create policy if not exists preceptors_select_own on public.clinical_preceptors
for select to authenticated using (user_id = auth.uid());
create policy if not exists preceptors_insert_own on public.clinical_preceptors
for insert to authenticated with check (user_id = auth.uid());
create policy if not exists preceptors_update_own on public.clinical_preceptors
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists preceptors_delete_own on public.clinical_preceptors
for delete to authenticated using (user_id = auth.uid());

create policy if not exists shifts_select_own on public.clinical_shifts
for select to authenticated using (user_id = auth.uid());
create policy if not exists shifts_insert_own on public.clinical_shifts
for insert to authenticated with check (user_id = auth.uid());
create policy if not exists shifts_update_own on public.clinical_shifts
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy if not exists shifts_delete_own on public.clinical_shifts
for delete to authenticated using (user_id = auth.uid());

-- 5) View (optional): shifts + preceptor object for easy selects
create or replace view public.user_clinical_shifts_with_preceptor as
select 
  s.id,
  s.user_id,
  s.date,
  s.start_time,
  s.end_time,
  s.shift_type,
  s.site,
  s.department,
  s.preceptor_id,
  s.hours_logged,
  s.notes,
  s.created_at,
  s.updated_at,
  json_build_object(
    'id', p.id,
    'name', p.name,
    'email', p.email,
    'phone', p.phone,
    'title', p.title
  ) as preceptor
from public.clinical_shifts s
join public.clinical_preceptors p on p.id = s.preceptor_id
where s.user_id = auth.uid();
