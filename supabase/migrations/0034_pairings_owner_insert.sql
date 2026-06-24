-- Outposts lets a parent mint room-device pairing codes for their own household.
-- The original insert policy was admin-only (provisioning); widen it so a household
-- owner can insert pairings scoped to their household (still admin OR mine).
drop policy if exists pairings_insert on public.device_pairings;
create policy pairings_insert on public.device_pairings for insert
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
