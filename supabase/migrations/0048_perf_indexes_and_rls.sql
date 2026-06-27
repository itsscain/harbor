-- Real-Time §7 / §10 — index the household-scoped lookups + sync since-cursor, and
-- keep RLS predicates cheap. Closes every "unindexed foreign key" + the household_members
-- auth-initplan finding from the performance advisor. Small family tables, so plain
-- (non-concurrent) CREATE INDEX is fine.

-- Household-scoped + sync-cursor (household_id leading covers the FK; updated_at as the
-- 2nd key serves the delta pull's `where household_id = ? and updated_at > cursor`).
create index if not exists chores_hh_updated_idx          on public.chores            (household_id, updated_at);
create index if not exists corners_hh_updated_idx         on public.corners           (household_id, updated_at);
create index if not exists groundings_hh_updated_idx      on public.groundings        (household_id, updated_at);
create index if not exists medications_hh_updated_idx     on public.medications       (household_id, updated_at);
create index if not exists skill_progress_hh_updated_idx  on public.skill_progress    (household_id, updated_at);

-- Household-scoped, no updated_at column.
create index if not exists medication_logs_hh_idx         on public.medication_logs   (household_id);
create index if not exists person_completions_hh_idx      on public.person_completions(household_id);
create index if not exists tides_insights_hh_idx          on public.tides_insights    (household_id);

-- Child-scoped FKs (household_id is already indexed on these).
create index if not exists events_child_idx              on public.events            (child_id);
create index if not exists reminders_child_idx           on public.reminders         (child_id);
create index if not exists wall_messages_child_idx       on public.wall_messages     (child_id);
create index if not exists device_pairings_child_idx     on public.device_pairings   (child_id);

-- Other unindexed FKs (joined by the broadcast trigger / membership / reward log).
create index if not exists household_members_profile_idx on public.household_members (profile_id);
create index if not exists person_completions_step_idx   on public.person_completions(step_id);
create index if not exists skill_progress_step_idx       on public.skill_progress    (step_id);
create index if not exists reward_log_chore_idx          on public.reward_log        (chore_id);
create index if not exists routines_with_child_idx       on public.routines          (with_child_id);

-- RLS initplan: household_members re-evaluated auth.uid() per row. Wrap in (select ...)
-- so it's computed once per statement. Logic is otherwise unchanged. (is_admin() is
-- already hoisted; household_is_mine(household_id) is row-dependent and can't be.)
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select
  using (
    (profile_id = (select auth.uid()))
    or (select public.is_admin())
    or public.household_is_mine(household_id)
  );

drop policy if exists household_members_write on public.household_members;
create policy household_members_write on public.household_members
  for all
  using (
    (select public.is_admin())
    or exists (select 1 from public.households h
               where h.id = household_members.household_id and h.owner_id = (select auth.uid()))
  )
  with check (
    (select public.is_admin())
    or exists (select 1 from public.households h
               where h.id = household_members.household_id and h.owner_id = (select auth.uid()))
  );
