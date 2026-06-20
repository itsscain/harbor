-- Harbor — Row-Level Security
-- admin → full access; parent → only their household; public → waitlist insert.

-- Enable RLS everywhere.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','households','children','routines','routine_steps','rewards',
    'reward_log','calm_tools','check_ins','builds','build_supplies','inventory',
    'customers','referrals','plus_subscriptions','device_pairings','waitlist'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ── households ───────────────────────────────────────────────────────────────
create policy households_select on public.households
  for select using (owner_id = auth.uid() or public.is_admin());
create policy households_insert on public.households
  for insert with check (owner_id = auth.uid() or public.is_admin());
create policy households_update on public.households
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy households_delete on public.households
  for delete using (public.is_admin());

-- ── child-scoped family tables (owner or admin) ──────────────────────────────
create policy children_all on public.children
  for all using (public.household_is_mine(household_id) or public.is_admin())
  with check (public.household_is_mine(household_id) or public.is_admin());

create policy routines_all on public.routines
  for all using (public.child_is_mine(child_id) or public.is_admin())
  with check (public.child_is_mine(child_id) or public.is_admin());

create policy routine_steps_all on public.routine_steps
  for all using (public.routine_is_mine(routine_id) or public.is_admin())
  with check (public.routine_is_mine(routine_id) or public.is_admin());

create policy rewards_all on public.rewards
  for all using (public.child_is_mine(child_id) or public.is_admin())
  with check (public.child_is_mine(child_id) or public.is_admin());

create policy reward_log_all on public.reward_log
  for all using (public.child_is_mine(child_id) or public.is_admin())
  with check (public.child_is_mine(child_id) or public.is_admin());

create policy calm_tools_all on public.calm_tools
  for all using (public.household_is_mine(household_id) or public.is_admin())
  with check (public.household_is_mine(household_id) or public.is_admin());

create policy check_ins_all on public.check_ins
  for all using (public.child_is_mine(child_id) or public.is_admin())
  with check (public.child_is_mine(child_id) or public.is_admin());

-- ── operator/commerce tables (admin only) ────────────────────────────────────
create policy builds_admin on public.builds
  for all using (public.is_admin()) with check (public.is_admin());
create policy build_supplies_admin on public.build_supplies
  for all using (public.is_admin()) with check (public.is_admin());
create policy inventory_admin on public.inventory
  for all using (public.is_admin()) with check (public.is_admin());
create policy customers_admin on public.customers
  for all using (public.is_admin()) with check (public.is_admin());
create policy referrals_admin on public.referrals
  for all using (public.is_admin()) with check (public.is_admin());

-- ── plus_subscriptions (admin full; owner read) ──────────────────────────────
create policy plus_admin on public.plus_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());
create policy plus_owner_select on public.plus_subscriptions
  for select using (public.household_is_mine(household_id));

-- ── device_pairings (admin full; owner read) ─────────────────────────────────
create policy pairings_admin on public.device_pairings
  for all using (public.is_admin()) with check (public.is_admin());
create policy pairings_owner_select on public.device_pairings
  for select using (public.household_is_mine(household_id));

-- ── waitlist (public insert; admin read) ─────────────────────────────────────
create policy waitlist_insert on public.waitlist
  for insert to anon, authenticated with check (true);
create policy waitlist_admin_select on public.waitlist
  for select using (public.is_admin());
