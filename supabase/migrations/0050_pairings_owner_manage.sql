-- Device Management §8 — let a household owner manage their OWN devices (rename, icon,
-- configure, unpair), not just admins. SELECT + INSERT were already owner-scoped (0034);
-- this widens UPDATE + DELETE to match. All still PIN-gated in the app + household-scoped.
drop policy if exists pairings_update on public.device_pairings;
create policy pairings_update on public.device_pairings for update
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

drop policy if exists pairings_delete on public.device_pairings;
create policy pairings_delete on public.device_pairings for delete
  using ((select public.is_admin()) or public.household_is_mine(household_id));
