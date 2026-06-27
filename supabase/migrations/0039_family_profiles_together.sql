-- Brand-True §4.1–4.2 — Family Profiles (people on the wall) + Parent Routines + Together Time.
-- "people" are non-child household members (parent/caregiver/sibling) who appear on the wall as
-- participants. They can have routines (NO rewards). A routine can be flagged "together" and linked
-- to a child so a parent + child do it side by side.

-- 1. people — wall-visible household members (distinct from auth profiles / household_members).
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  avatar text,
  photo_url text,
  color text,
  role text not null default 'parent',
  settings jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists people_household_idx on public.people(household_id);
alter table public.people enable row level security;
drop policy if exists people_rw on public.people;
create policy people_rw on public.people for all
  using (public.household_is_mine(household_id) or public.is_admin())
  with check (public.household_is_mine(household_id) or public.is_admin());
drop trigger if exists set_updated_at on public.people;
create trigger set_updated_at before update on public.people
  for each row execute function public.set_updated_at();

-- 2. routines can belong to a person instead of a child, and be a "together" moment.
alter table public.routines alter column child_id drop not null;
alter table public.routines add column if not exists person_id uuid references public.people(id) on delete cascade;
alter table public.routines add column if not exists together boolean not null default false;
alter table public.routines add column if not exists with_child_id uuid references public.children(id) on delete set null;
alter table public.routines drop constraint if exists routines_owner_chk;
alter table public.routines add constraint routines_owner_chk
  check ((child_id is not null)::int + (person_id is not null)::int = 1);
create index if not exists routines_person_idx on public.routines(person_id);

-- 3. routine_is_mine must accept person routines (child_id may be null now).
create or replace function public.routine_is_mine(r uuid) returns boolean
  language sql security definer set search_path = '' stable as $$
  select exists(
    select 1 from public.routines rt
    left join public.children ch on ch.id = rt.child_id
    left join public.people pp on pp.id = rt.person_id
    where rt.id = r
      and (public.household_is_mine(ch.household_id) or public.household_is_mine(pp.household_id))
  );
$$;

-- 4. person_completions — durable, idempotent log of a person finishing a step. NO rewards;
--    purely for modeling/streaks + the parent app.
create table if not exists public.person_completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  step_id uuid references public.routine_steps(id) on delete set null,
  client_op_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists person_completions_person_idx on public.person_completions(person_id);
alter table public.person_completions enable row level security;
drop policy if exists person_completions_rw on public.person_completions;
create policy person_completions_rw on public.person_completions for all
  using (public.household_is_mine(household_id) or public.is_admin())
  with check (public.household_is_mine(household_id) or public.is_admin());
