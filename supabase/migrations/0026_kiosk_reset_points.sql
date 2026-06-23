-- Parent-PIN-gated points reset from the wall. Device-validated like the other
-- kiosk RPCs. Writes a balancing 'reset' row to reward_log (keeps the ledger
-- truthful) then zeros each child's running total. History is preserved.
create or replace function public.rpc_kiosk_reset_points(p_secret uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_household uuid;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;

  insert into public.reward_log (child_id, delta, reason)
  select rw.child_id, -rw.points_total, 'reset'
  from public.rewards rw
  join public.children c on c.id = rw.child_id
  where c.household_id = v_household and rw.points_total <> 0;

  update public.rewards rw
  set points_total = 0, updated_at = now()
  from public.children c
  where c.id = rw.child_id and c.household_id = v_household and rw.points_total <> 0;

  return jsonb_build_object('ok', true);
end;
$function$;

-- The kiosk runs as the anon role; grant execute like the other kiosk RPCs.
grant execute on function public.rpc_kiosk_reset_points(uuid) to anon, authenticated;
