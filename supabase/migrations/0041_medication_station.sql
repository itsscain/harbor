-- Brand-True §4.3 — the Medication Station. A calm, dignified med section, SEPARATE from
-- routines/chores. A tracker + supportive ritual, NOT a dosing/dispensing system. NO points.

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  name text not null,
  dose text,
  icon text,
  helps_note text,
  schedule_times text[] not null default '{}',
  days_of_week int[],
  with_food boolean not null default false,
  parent_administered boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists medications_child_idx on public.medications(child_id);
alter table public.medications enable row level security;
drop policy if exists medications_rw on public.medications;
create policy medications_rw on public.medications for all
  using (public.child_is_mine(child_id) or public.is_admin())
  with check (public.child_is_mine(child_id) or public.is_admin());
drop trigger if exists set_updated_at on public.medications;
create trigger set_updated_at before update on public.medications
  for each row execute function public.set_updated_at();

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  dose_date date not null,
  dose_time text,
  status text not null default 'taken',
  confirmed_by text,
  client_op_id text unique,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists medication_logs_child_idx on public.medication_logs(child_id, dose_date);
create index if not exists medication_logs_med_idx on public.medication_logs(medication_id, dose_date);
alter table public.medication_logs enable row level security;
drop policy if exists medication_logs_rw on public.medication_logs;
create policy medication_logs_rw on public.medication_logs for all
  using (public.child_is_mine(child_id) or public.is_admin())
  with check (public.child_is_mine(child_id) or public.is_admin());
