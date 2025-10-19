-- Exams schema and related objects (idempotent where supported)

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  time time,
  location text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists exams_user_id_idx on public.exams(user_id);
create index if not exists exams_date_idx on public.exams(date);

-- updated_at trigger
create or replace function public.exams_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.exams_set_updated_at();

-- Row Level Security
alter table public.exams enable row level security;

-- Create policy exams_select_own if not exists
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'exams'
      and policyname = 'exams_select_own'
  ) then
    execute $sql$
      create policy exams_select_own on public.exams
        for select to authenticated using (user_id = auth.uid());
    $sql$;
  end if;
end
$$;

-- Create policy exams_insert_own if not exists
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'exams'
      and policyname = 'exams_insert_own'
  ) then
    execute $sql$
      create policy exams_insert_own on public.exams
        for insert to authenticated with check (user_id = auth.uid());
    $sql$;
  end if;
end
$$;

-- Create policy exams_update_own if not exists
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'exams'
      and policyname = 'exams_update_own'
  ) then
    execute $sql$
      create policy exams_update_own on public.exams
        for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    $sql$;
  end if;
end
$$;

-- Create policy exams_delete_own if not exists
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'exams'
      and policyname = 'exams_delete_own'
  ) then
    execute $sql$
      create policy exams_delete_own on public.exams
        for delete to authenticated using (user_id = auth.uid());
    $sql$;
  end if;
end
$$;