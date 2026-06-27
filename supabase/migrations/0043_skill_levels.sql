-- Brand-True §4.4 — Skill Levels (fading scaffolds → independence). Celebrate the
-- independence, not the checkmark. Harbor grows with the child and helps them need it less.

-- support_level = parent BASELINE scaffolding per step:
--   1 full · 2 fewer prompts · 3 just a reminder · 4 on your own
alter table public.routine_steps add column if not exists support_level int not null default 1;

-- skill_progress = the child's EARNED independence per step (wall-computed, synced for the
-- parent's growth view). effective level on the wall = min(4, support_level + level_earned).
-- Compassionate: a hard day never decrements; the parent re-scaffolds manually.
create table if not exists public.skill_progress (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  step_id uuid not null references public.routine_steps(id) on delete cascade,
  streak int not null default 0,
  level_earned int not null default 0,
  last_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, step_id)
);
create index if not exists skill_progress_child_idx on public.skill_progress(child_id);
alter table public.skill_progress enable row level security;
drop policy if exists skill_progress_rw on public.skill_progress;
create policy skill_progress_rw on public.skill_progress for all
  using (public.child_is_mine(child_id) or public.is_admin())
  with check (public.child_is_mine(child_id) or public.is_admin());
drop trigger if exists set_updated_at on public.skill_progress;
create trigger set_updated_at before update on public.skill_progress
  for each row execute function public.set_updated_at();
