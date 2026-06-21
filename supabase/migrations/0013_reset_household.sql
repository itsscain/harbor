-- Harbor — full "fresh start" reset for an owner's household.
-- Wipes ALL family content (children + cascade, plus household-scoped content) and
-- records child tombstones so paired walls drop the kids on their next sync.
-- Keeps the household, Plus, and device pairings intact.

create or replace function public.reset_household(p_household uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not (public.household_is_mine(p_household) or public.is_admin()) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  -- Tombstone every live child so the wall removes them on sync.
  insert into public.kiosk_deletions (household_id, entity, entity_id)
  select p_household, 'child', id from public.children where household_id = p_household;

  -- Delete all children → cascades to routines, routine_steps, rewards,
  -- reward_log, check_ins, and child-scoped events/store_items/wall_messages.
  delete from public.children where household_id = p_household;

  -- Delete remaining household-scoped content (whole-family items).
  delete from public.events where household_id = p_household;
  delete from public.store_items where household_id = p_household;
  delete from public.list_items where household_id = p_household;
  delete from public.wall_messages where household_id = p_household;
  delete from public.reminders where household_id = p_household;
  delete from public.meals where household_id = p_household;
  delete from public.calm_tools where household_id = p_household;

  -- Reset wall display settings (weather, quiet hours, photos, onboarding flags).
  update public.households set settings = '{}'::jsonb where id = p_household;
end $$;
revoke execute on function public.reset_household(uuid) from public, anon;
grant execute on function public.reset_household(uuid) to authenticated;
