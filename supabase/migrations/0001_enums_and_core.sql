-- Harbor — enums + core family tables
-- Households own everything; children belong to households; routines to children;
-- steps to routines. Syncable tables carry updated_at + deleted_at for delta sync.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.user_role as enum ('admin', 'parent');
create type public.routine_type as enum ('schedule', 'first_then');
create type public.step_type as enum ('task', 'first', 'then');
create type public.calm_tool_type as enum ('breathing', 'feelings', 'break', 'social_story');

-- ── profiles (1:1 with auth.users) ───────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'parent',
  full_name text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── households ───────────────────────────────────────────────────────────────
create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  plus_active boolean not null default false, -- denormalized; webhook keeps in sync
  parent_pin_hash text,                       -- kiosk parent-gate PIN (hashed)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index households_owner_idx on public.households (owner_id);

-- ── children ─────────────────────────────────────────────────────────────────
create table public.children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  avatar text,                       -- emoji or photo url
  settings jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index children_household_idx on public.children (household_id);

-- ── routines ─────────────────────────────────────────────────────────────────
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  name text not null,
  type public.routine_type not null default 'schedule',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index routines_child_idx on public.routines (child_id);

-- ── routine_steps ────────────────────────────────────────────────────────────
create table public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  order_index int not null default 0,
  label text not null,
  icon text,
  photo_url text,
  step_type public.step_type not null default 'task',
  reward_points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index routine_steps_routine_idx on public.routine_steps (routine_id);

-- ── rewards (running total, one per child) ───────────────────────────────────
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children (id) on delete cascade,
  points_total int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── reward_log (append-only history / redemptions) ───────────────────────────
create table public.reward_log (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  delta int not null,                -- + earned, - redeemed
  reason text,
  step_id uuid references public.routine_steps (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index reward_log_child_idx on public.reward_log (child_id);

-- ── calm_tools (child-specific or household-wide) ────────────────────────────
create table public.calm_tools (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade, -- null = household-wide
  tool_type public.calm_tool_type not null,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index calm_tools_household_idx on public.calm_tools (household_id);
create index calm_tools_child_idx on public.calm_tools (child_id);

-- ── check_ins (feelings) ─────────────────────────────────────────────────────
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  feeling text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index check_ins_child_idx on public.check_ins (child_id);
create index check_ins_created_idx on public.check_ins (created_at);
