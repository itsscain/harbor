-- Routines & App Phase 3 (§8-§10): the advanced, premium routine builder.
-- Everything here is ADDITIVE and backward-compatible:
--  1) routine_steps: an orthogonal `kind` (interaction type) + rich per-step fields.
--     `kind` is separate from the existing `step_type` enum (task/first/then, which
--     encodes First/Then BOARD position) so we never churn the enum and the two
--     concerns stay independent. Default 'standard' = today's behavior exactly.
--  2) routines: strict_order, celebration_style, per-routine sensory_intensity.
--  3) routine_templates + step_library: curated (household_id null) + household-saved,
--     the "start fast / reuse everything" library (§9). Parent-app only (RLS via the
--     request-scoped client) — NOT synced to the wall, so no snapshot/broadcast change.
--
-- The kiosk snapshot serializes steps/routines with to_jsonb(), so every new COLUMN
-- flows to the wall automatically — no kiosk_snapshot/rpc_kiosk_push rebuild needed.
-- Per-step completion + points is already generic, so new kinds award points the same
-- way (the health rule is simply reward_points = 0).

-- ── 1. routine_steps: interaction kind + rich per-step fields ─────────────────
alter table public.routine_steps add column if not exists kind text not null default 'standard';
do $$ begin
  alter table public.routine_steps add constraint routine_steps_kind_chk
    check (kind in ('standard','timed','approval','together','choice','substep'));
exception when duplicate_object then null; end $$;
-- Custom read-aloud text (falls back to label on the wall); a gentle hint; a parent-
-- facing "why this matters"; a sensory note; and JSON payloads for choice/sub-stepped.
alter table public.routine_steps add column if not exists read_aloud text;
alter table public.routine_steps add column if not exists hint text;
alter table public.routine_steps add column if not exists why_note text;
alter table public.routine_steps add column if not exists sensory_note text;
alter table public.routine_steps add column if not exists choice_options jsonb;  -- [{icon,label}]
alter table public.routine_steps add column if not exists substeps jsonb;         -- [{icon,label}]

-- ── 2. routines: routine-level power (all wired on the wall) ──────────────────
-- strict_order: steps must be done in order (out-of-order taps get the no-silent-no-op
--   nudge, §5). celebration_style: how the arrival moment plays. sensory_intensity:
--   per-routine override of the child's intensity (null = inherit the child setting).
alter table public.routines add column if not exists strict_order boolean not null default false;
alter table public.routines add column if not exists celebration_style text;
do $$ begin
  alter table public.routines add constraint routines_celebration_chk
    check (celebration_style is null or celebration_style in ('auto','confetti','calm','voyage'));
exception when duplicate_object then null; end $$;
alter table public.routines add column if not exists sensory_intensity text;
do $$ begin
  alter table public.routines add constraint routines_sensory_chk
    check (sensory_intensity is null or sensory_intensity in ('calm','standard','vivid'));
exception when duplicate_object then null; end $$;

-- ── 3. routine_templates (curated + household-saved) ─────────────────────────
create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,  -- null = curated (Harbor-made)
  name text not null,
  emoji text,
  description text,
  need_tags text[],
  content jsonb not null,     -- { type, strict_order?, steps: [{icon,label,points,kind,...}] }
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists routine_templates_hh_idx on public.routine_templates (household_id, sort_order);
alter table public.routine_templates enable row level security;
-- Read: anyone signed in sees curated rows; households see their own saved ones.
drop policy if exists routine_templates_read on public.routine_templates;
create policy routine_templates_read on public.routine_templates for select
  using (household_id is null or (select public.is_admin()) or public.household_is_mine(household_id));
-- Write: only your own household's rows (curated rows are seed/admin-managed).
drop policy if exists routine_templates_write on public.routine_templates;
create policy routine_templates_write on public.routine_templates for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
drop trigger if exists set_updated_at on public.routine_templates;
create trigger set_updated_at before update on public.routine_templates
  for each row execute function public.set_updated_at();

-- ── 4. step_library (curated + household-saved) ──────────────────────────────
create table if not exists public.step_library (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,  -- null = curated
  label text not null,
  icon text,
  category text,
  default_points int not null default 0,
  kind text not null default 'standard',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists step_library_hh_idx on public.step_library (household_id, category, sort_order);
alter table public.step_library enable row level security;
drop policy if exists step_library_read on public.step_library;
create policy step_library_read on public.step_library for select
  using (household_id is null or (select public.is_admin()) or public.household_is_mine(household_id));
drop policy if exists step_library_write on public.step_library;
create policy step_library_write on public.step_library for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
drop trigger if exists set_updated_at on public.step_library;
create trigger set_updated_at before update on public.step_library
  for each row execute function public.set_updated_at();

-- ── 5. Seed the curated library (idempotent: only when empty) ────────────────
-- Curated routine templates by NEED (evidence-informed, brand-true) — the same
-- calm starting points the builder offers, now data-driven & reusable (§9).
insert into public.routine_templates (household_id, name, emoji, description, need_tags, content, sort_order)
select * from (values
  (null::uuid, 'Morning', '🌅', 'A calm, classic school-morning flow.', array['morning','school'],
   '{"type":"schedule","steps":[
     {"icon":"🌅","label":"Wake up"},{"icon":"🚽","label":"Bathroom"},
     {"icon":"👕","label":"Get dressed","points":5},{"icon":"🪥","label":"Brush teeth","points":5,"kind":"standard"},
     {"icon":"🥣","label":"Breakfast","points":5},{"icon":"🎒","label":"Shoes & bag","points":5}]}'::jsonb, 0),
  (null, 'Bedtime', '🌙', 'A gentle wind-down to sleep.', array['bedtime','evening'],
   '{"type":"schedule","strict_order":true,"steps":[
     {"icon":"🛁","label":"Bath time"},{"icon":"🌙","label":"Pajamas","points":5},
     {"icon":"🪥","label":"Brush teeth","points":5},{"icon":"📖","label":"Story","points":10},
     {"icon":"💡","label":"Lights out"}]}'::jsonb, 1),
  (null, 'After school', '🍎', 'Land, reset, and get it done.', array['afterschool'],
   '{"type":"schedule","steps":[
     {"icon":"🍎","label":"Snack"},{"icon":"🎒","label":"Unpack bag"},
     {"icon":"✏️","label":"Homework","points":10},{"icon":"🧸","label":"Free play"},
     {"icon":"🧹","label":"Tidy up","points":5}]}'::jsonb, 2),
  (null, 'First / Then', '🔁', 'One clear "first this, then that".', array['first_then','focus'],
   '{"type":"first_then","steps":[
     {"icon":"🧸","label":"Clean up","step_type":"first"},
     {"icon":"📺","label":"Screen time","step_type":"then"}]}'::jsonb, 3),
  (null, 'ADHD-friendly morning', '⚡', 'Short, concrete, low-overwhelm — momentum first.', array['adhd','morning','focus'],
   '{"type":"schedule","strict_order":true,"steps":[
     {"icon":"🌅","label":"Wake up + big stretch"},{"icon":"💧","label":"Drink some water"},
     {"icon":"👕","label":"Clothes (laid out)","points":5},{"icon":"🥣","label":"Breakfast","points":5},
     {"icon":"🪥","label":"Brush teeth","points":5},{"icon":"🎒","label":"Bag by the door","points":5}]}'::jsonb, 4),
  (null, 'Autism-friendly bedtime', '🧩', 'Predictable, same-every-night, with a warning.', array['autism','bedtime','sensory'],
   '{"type":"schedule","strict_order":true,"sensory_intensity":"calm","steps":[
     {"icon":"🔔","label":"5-minute warning","kind":"timed"},{"icon":"🛁","label":"Bath / wash up"},
     {"icon":"🌙","label":"Pajamas","points":5},{"icon":"🪥","label":"Brush teeth","points":5},
     {"icon":"📖","label":"Same story","points":5},{"icon":"💡","label":"Dim the lights"},
     {"icon":"🧸","label":"Cozy in bed"}]}'::jsonb, 5),
  (null, 'Anxiety wind-down', '🫧', 'Slow the body, look ahead together.', array['anxiety','evening','sensory'],
   '{"type":"schedule","sensory_intensity":"calm","steps":[
     {"icon":"🫧","label":"Slow belly breaths"},{"icon":"🍵","label":"Warm drink"},
     {"icon":"🧩","label":"Quiet, easy activity"},{"icon":"🗒️","label":"Look at tomorrow together"},
     {"icon":"🛏️","label":"Cozy up"}]}'::jsonb, 6),
  (null, 'Low-demand day', '💛', 'The essentials only — kind and light.', array['low_demand','flexible'],
   '{"type":"schedule","steps":[
     {"icon":"🍎","label":"Eat something"},{"icon":"💧","label":"Drink water"},
     {"icon":"👕","label":"Comfy clothes"},{"icon":"💛","label":"One kind thing"}]}'::jsonb, 7)
) as t(household_id, name, emoji, description, need_tags, content, sort_order)
where not exists (select 1 from public.routine_templates where household_id is null);

-- Curated step library — common steps with a good default icon + points, so building
-- is assembling, not typing (§9).
insert into public.step_library (household_id, label, icon, category, default_points, kind, sort_order)
select * from (values
  (null::uuid, 'Wake up', '🌅', 'Morning', 0, 'standard', 0),
  (null, 'Bathroom', '🚽', 'Morning', 0, 'standard', 1),
  (null, 'Get dressed', '👕', 'Morning', 5, 'standard', 2),
  (null, 'Brush teeth', '🪥', 'Hygiene', 5, 'standard', 3),
  (null, 'Brush hair', '💇', 'Hygiene', 0, 'standard', 4),
  (null, 'Wash face', '🧼', 'Hygiene', 0, 'standard', 5),
  (null, 'Breakfast', '🥣', 'Meals', 5, 'standard', 6),
  (null, 'Lunch', '🥪', 'Meals', 5, 'standard', 7),
  (null, 'Drink water', '💧', 'Meals', 0, 'standard', 8),
  (null, 'Snack', '🍎', 'Meals', 0, 'standard', 9),
  (null, 'Shoes & bag', '🎒', 'Out the door', 5, 'standard', 10),
  (null, 'Make bed', '🛏️', 'Tidy', 5, 'standard', 11),
  (null, 'Tidy up', '🧹', 'Tidy', 5, 'standard', 12),
  (null, 'Homework', '✏️', 'School', 10, 'standard', 13),
  (null, 'Read', '📖', 'School', 10, 'standard', 14),
  (null, 'Feed the pet', '🐾', 'Chores', 5, 'standard', 15),
  (null, 'Pajamas', '🌙', 'Bedtime', 5, 'standard', 16),
  (null, 'Bath time', '🛁', 'Bedtime', 0, 'standard', 17),
  (null, 'Story', '📚', 'Bedtime', 5, 'standard', 18),
  (null, 'Lights out', '💡', 'Bedtime', 0, 'standard', 19),
  (null, 'Take a breath', '🫧', 'Calm', 0, 'standard', 20),
  (null, 'Pick an activity', '🎲', 'Choice', 0, 'choice', 21)
) as t(household_id, label, icon, category, default_points, kind, sort_order)
where not exists (select 1 from public.step_library where household_id is null);
