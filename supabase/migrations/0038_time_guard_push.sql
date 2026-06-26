-- Edge Cases §1.2 (server backstop) — reject FUTURE-DATED economy events. The kiosk
-- sends each award's created_at (the device clock). A child who rolls the clock
-- forward to "tomorrow" to re-earn (E2) produces future-dated completions; on sync
-- the server rejects any economy event > now()+2min, so forward-clock farming never
-- persists (the local optimistic points reconcile away on the next pull). Backward/
-- same-day re-earns are already handled by the deterministic op_id (§1.1, migration
-- 0037). Recreated from the live def; only adds the future-guard to the 3 economy loops.
CREATE OR REPLACE FUNCTION public.rpc_kiosk_push(p_secret uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_household uuid;
  v_item jsonb;
  v_child uuid;
  v_step uuid;
  v_chore uuid;
  v_opid text;
  v_points int;
  v_applied int := 0;
  v_future timestamptz := now() + interval '2 minutes';  -- small clock-skew allowance
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'check_ins', '[]'::jsonb))
  loop
    v_child := (v_item ->> 'child_id')::uuid;
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.check_ins (child_id, feeling, note, created_at)
      values (v_child, coalesce(v_item ->> 'feeling', 'unknown'), v_item ->> 'note',
              coalesce((v_item ->> 'created_at')::timestamptz, now()));
      v_applied := v_applied + 1;
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'completions', '[]'::jsonb))
  loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future; -- §1.2 future-guard
    v_child := (v_item ->> 'child_id')::uuid;
    v_step := nullif(v_item ->> 'step_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');

    select s.reward_points into v_points
    from public.routine_steps s
    join public.routines r on r.id = s.routine_id
    join public.children c on c.id = r.child_id
    where s.id = v_step and c.id = v_child and c.household_id = v_household
      and s.deleted_at is null;

    if found then
      insert into public.reward_log (child_id, delta, reason, step_id, client_op_id, created_at)
      values (v_child, v_points, 'step', v_step, v_opid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0)
          on conflict (child_id) do nothing;
        update public.rewards set points_total = points_total + v_points where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'chore_dones', '[]'::jsonb))
  loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future; -- §1.2 future-guard
    v_child := (v_item ->> 'child_id')::uuid;
    v_chore := nullif(v_item ->> 'chore_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');

    select ch.points into v_points
    from public.chores ch
    where ch.id = v_chore
      and ch.household_id = v_household
      and ch.deleted_at is null
      and (ch.child_id = v_child
           or (ch.rotation_member_ids is not null and ch.rotation_member_ids @> to_jsonb(v_child::text)))
      and exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household);

    if found then
      insert into public.reward_log (child_id, delta, reason, chore_id, client_op_id, created_at)
      values (v_child, v_points, 'chore', v_chore, v_opid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0)
          on conflict (child_id) do nothing;
        update public.rewards set points_total = points_total + v_points where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'redemptions', '[]'::jsonb))
  loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future; -- §1.2 future-guard
    v_child := (v_item ->> 'child_id')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');
    v_points := abs(coalesce((v_item ->> 'points')::int, 0));
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.reward_log (child_id, delta, reason, store_item_id, client_op_id, created_at)
      values (v_child, -v_points,
              coalesce(v_item ->> 'label', v_item ->> 'reason', 'reward'),
              nullif(v_item ->> 'store_item_id', '')::uuid, v_opid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0)
          on conflict (child_id) do nothing;
        update public.rewards set points_total = greatest(0, points_total - v_points) where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'list_ops', '[]'::jsonb))
  loop
    if (v_item ->> 'op') = 'add' then
      insert into public.list_items (id, household_id, list_kind, name, category, quantity, added_by_label, created_at)
      values (
        coalesce(nullif(v_item ->> 'client_id', '')::uuid, gen_random_uuid()),
        v_household,
        coalesce(v_item ->> 'list_kind', 'grocery'),
        coalesce(v_item ->> 'name', 'Item'),
        v_item ->> 'category',
        v_item ->> 'quantity',
        v_item ->> 'added_by_label',
        coalesce((v_item ->> 'created_at')::timestamptz, now())
      )
      on conflict (id) do nothing;
      v_applied := v_applied + 1;
    elsif (v_item ->> 'op') = 'check' then
      update public.list_items
        set checked = coalesce((v_item ->> 'checked')::boolean, true), updated_at = now()
      where id = (v_item ->> 'id')::uuid and household_id = v_household;
      v_applied := v_applied + 1;
    end if;
  end loop;

  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return jsonb_build_object('ok', true, 'applied', v_applied, 'server_time', now());
end;
$function$;
