-- Harbor — advisor remediations (security + performance)
-- The remaining SECURITY DEFINER advisories on is_admin/*_is_mine and the
-- rpc_kiosk_* functions are intentional: the helpers must bypass RLS to avoid
-- policy recursion, and the kiosk RPCs are designed to be called by anon (they
-- validate a device secret internally).

-- ── security: pin search_path on the trigger fn ──────────────────────────────
alter function public.set_updated_at() set search_path = '';

-- ── security: handle_new_user is a trigger fn, not an API endpoint ───────────
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── security + spam: validate waitlist inserts (was WITH CHECK true) ─────────
drop policy waitlist_insert on public.waitlist;
create policy waitlist_insert on public.waitlist
  for insert to anon, authenticated
  with check (
    char_length(name) between 1 and 200
    and char_length(email) between 3 and 320
    and position('@' in email) > 1
  );

-- ── performance: cover foreign keys ──────────────────────────────────────────
create index if not exists customers_build_idx on public.customers (build_id);
create index if not exists customers_household_idx on public.customers (household_id);
create index if not exists reward_log_step_idx on public.reward_log (step_id);

-- ── performance: wrap auth.uid()/is_admin() so they evaluate once per query ──
-- profiles
drop policy profiles_select on public.profiles;
drop policy profiles_insert on public.profiles;
drop policy profiles_update on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_insert on public.profiles for insert
  with check (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- households
drop policy households_select on public.households;
drop policy households_insert on public.households;
drop policy households_update on public.households;
drop policy households_delete on public.households;
create policy households_select on public.households for select
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy households_insert on public.households for insert
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy households_update on public.households for update
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy households_delete on public.households for delete
  using ((select public.is_admin()));

-- child-scoped family tables (cache the admin check)
drop policy children_all on public.children;
create policy children_all on public.children for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

drop policy routines_all on public.routines;
create policy routines_all on public.routines for all
  using ((select public.is_admin()) or public.child_is_mine(child_id))
  with check ((select public.is_admin()) or public.child_is_mine(child_id));

drop policy routine_steps_all on public.routine_steps;
create policy routine_steps_all on public.routine_steps for all
  using ((select public.is_admin()) or public.routine_is_mine(routine_id))
  with check ((select public.is_admin()) or public.routine_is_mine(routine_id));

drop policy rewards_all on public.rewards;
create policy rewards_all on public.rewards for all
  using ((select public.is_admin()) or public.child_is_mine(child_id))
  with check ((select public.is_admin()) or public.child_is_mine(child_id));

drop policy reward_log_all on public.reward_log;
create policy reward_log_all on public.reward_log for all
  using ((select public.is_admin()) or public.child_is_mine(child_id))
  with check ((select public.is_admin()) or public.child_is_mine(child_id));

drop policy calm_tools_all on public.calm_tools;
create policy calm_tools_all on public.calm_tools for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

drop policy check_ins_all on public.check_ins;
create policy check_ins_all on public.check_ins for all
  using ((select public.is_admin()) or public.child_is_mine(child_id))
  with check ((select public.is_admin()) or public.child_is_mine(child_id));

-- operator/commerce (admin only) — cache the check
drop policy builds_admin on public.builds;
create policy builds_admin on public.builds for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy build_supplies_admin on public.build_supplies;
create policy build_supplies_admin on public.build_supplies for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy inventory_admin on public.inventory;
create policy inventory_admin on public.inventory for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy customers_admin on public.customers;
create policy customers_admin on public.customers for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy referrals_admin on public.referrals;
create policy referrals_admin on public.referrals for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── performance: collapse duplicate permissive SELECT policies ───────────────
-- plus_subscriptions: one SELECT (admin or owner) + admin-only writes
drop policy plus_admin on public.plus_subscriptions;
drop policy plus_owner_select on public.plus_subscriptions;
create policy plus_select on public.plus_subscriptions for select
  using ((select public.is_admin()) or public.household_is_mine(household_id));
create policy plus_insert on public.plus_subscriptions for insert
  with check ((select public.is_admin()));
create policy plus_update on public.plus_subscriptions for update
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy plus_delete on public.plus_subscriptions for delete
  using ((select public.is_admin()));

-- device_pairings: one SELECT (admin or owner) + admin-only writes
drop policy pairings_admin on public.device_pairings;
drop policy pairings_owner_select on public.device_pairings;
create policy pairings_select on public.device_pairings for select
  using ((select public.is_admin()) or public.household_is_mine(household_id));
create policy pairings_insert on public.device_pairings for insert
  with check ((select public.is_admin()));
create policy pairings_update on public.device_pairings for update
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy pairings_delete on public.device_pairings for delete
  using ((select public.is_admin()));
