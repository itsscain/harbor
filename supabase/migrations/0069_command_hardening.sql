-- Command hardening (post-review).
-- 1) Atomic parent star adjustment — replaces the two client calls in the grantStars
--    server action (which swallowed errors and could race two concurrent grants into a
--    lost update). One SECURITY DEFINER txn: validate ownership → write the ledger row →
--    atomically bump the balance (`points_total + delta`) → return the new total.
create or replace function public.rpc_parent_adjust_points(p_child uuid, p_delta int, p_reason text default null)
 returns int language plpgsql security definer set search_path to ''
as $function$
declare v_total int;
begin
  if not public.child_is_mine(p_child) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  p_delta := greatest(-100000, least(100000, coalesce(p_delta, 0)));
  if p_delta = 0 then
    return coalesce((select points_total from public.rewards where child_id = p_child), 0);
  end if;
  insert into public.reward_log (child_id, delta, reason)
    values (p_child, p_delta, coalesce(nullif(p_reason, ''), 'adjust'));
  insert into public.rewards (child_id, points_total) values (p_child, 0)
    on conflict (child_id) do nothing;
  update public.rewards
    set points_total = greatest(0, points_total + p_delta), updated_at = now()
    where child_id = p_child
    returning points_total into v_total;
  return coalesce(v_total, 0);
end $function$;

revoke execute on function public.rpc_parent_adjust_points(uuid, int, text) from anon, public;
grant execute on function public.rpc_parent_adjust_points(uuid, int, text) to authenticated;

-- 2) requests_notify is a trigger function, never a callable RPC. The 0068 revoke from
--    {anon, authenticated} was ineffective because EXECUTE is still held via PUBLIC (the
--    default grant on new functions). Revoke from PUBLIC to actually close it.
revoke execute on function public.requests_notify() from public, anon, authenticated;
