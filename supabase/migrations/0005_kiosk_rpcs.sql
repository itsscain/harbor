-- Harbor — kiosk RPCs (SECURITY DEFINER)
-- The kiosk has no user login. It authenticates with a device_secret issued at
-- pairing. These functions validate that secret server-side and scope every
-- operation to the bound household. Table-level RLS stays strict; the kiosk
-- never touches tables directly.

-- Internal snapshot builder. NOT granted to clients (would leak any household).
create or replace function public.kiosk_snapshot(p_household uuid, p_since timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'household', (
      select jsonb_build_object(
        'id', h.id, 'name', h.name, 'plus_active', h.plus_active,
        'parent_pin_set', (h.parent_pin_hash is not null)
      )
      from public.households h where h.id = p_household
    ),
    'children', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.sort_order)
      from public.children c
      where c.household_id = p_household
        and ((p_since is null and c.deleted_at is null)
             or (p_since is not null and c.updated_at > p_since))
    ), '[]'::jsonb),
    'routines', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.sort_order)
      from public.routines r
      join public.children c on c.id = r.child_id
      where c.household_id = p_household
        and ((p_since is null and r.deleted_at is null)
             or (p_since is not null and r.updated_at > p_since))
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.order_index)
      from public.routine_steps s
      join public.routines r on r.id = s.routine_id
      join public.children c on c.id = r.child_id
      where c.household_id = p_household
        and ((p_since is null and s.deleted_at is null)
             or (p_since is not null and s.updated_at > p_since))
    ), '[]'::jsonb),
    'rewards', coalesce((
      select jsonb_agg(to_jsonb(rw))
      from public.rewards rw
      join public.children c on c.id = rw.child_id
      where c.household_id = p_household
        and (p_since is null or rw.updated_at > p_since)
    ), '[]'::jsonb),
    'calm_tools', coalesce((
      select jsonb_agg(to_jsonb(ct) order by ct.sort_order)
      from public.calm_tools ct
      where ct.household_id = p_household
        and ((p_since is null and ct.deleted_at is null)
             or (p_since is not null and ct.updated_at > p_since))
    ), '[]'::jsonb),
    'server_time', now()
  );
$$;
revoke execute on function public.kiosk_snapshot(uuid, timestamptz) from public, anon, authenticated;

-- Pair a device with a household using a one-time pending code.
create or replace function public.rpc_kiosk_pair(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_pairing public.device_pairings;
  v_secret uuid;
begin
  select * into v_pairing from public.device_pairings
  where code = upper(trim(p_code)) and status = 'pending'
  limit 1;

  if not found then
    raise exception 'invalid_or_used_code' using errcode = 'P0001';
  end if;

  v_secret := gen_random_uuid();
  update public.device_pairings
    set device_secret = v_secret, status = 'paired',
        paired_at = now(), last_synced_at = now()
  where id = v_pairing.id;

  return jsonb_build_object(
    'device_secret', v_secret,
    'household_id', v_pairing.household_id,
    'snapshot', public.kiosk_snapshot(v_pairing.household_id, null)
  );
end;
$$;

-- Pull a fresh snapshot (or delta since a timestamp) for a paired device.
create or replace function public.rpc_kiosk_pull(p_secret uuid, p_since timestamptz default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_household uuid;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;
  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return public.kiosk_snapshot(v_household, p_since);
end;
$$;

-- Apply child-safe writes from the kiosk: feelings check-ins, step completions
-- (award points), and reward redemptions. Each item is verified to belong to the
-- device's household before it is applied.
create or replace function public.rpc_kiosk_push(p_secret uuid, p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_household uuid;
  v_item jsonb;
  v_child uuid;
  v_points int;
  v_applied int := 0;
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
    v_child := (v_item ->> 'child_id')::uuid;
    v_points := coalesce((v_item ->> 'points')::int, 0);
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.reward_log (child_id, delta, reason, step_id, created_at)
      values (v_child, v_points, 'step', nullif(v_item ->> 'step_id', '')::uuid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()));
      insert into public.rewards (child_id, points_total) values (v_child, 0)
        on conflict (child_id) do nothing;
      update public.rewards set points_total = points_total + v_points where child_id = v_child;
      v_applied := v_applied + 1;
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'redemptions', '[]'::jsonb))
  loop
    v_child := (v_item ->> 'child_id')::uuid;
    v_points := abs(coalesce((v_item ->> 'points')::int, 0));
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.reward_log (child_id, delta, reason, created_at)
      values (v_child, -v_points, coalesce(v_item ->> 'reason', 'reward'),
              coalesce((v_item ->> 'created_at')::timestamptz, now()));
      insert into public.rewards (child_id, points_total) values (v_child, 0)
        on conflict (child_id) do nothing;
      update public.rewards set points_total = greatest(0, points_total - v_points) where child_id = v_child;
      v_applied := v_applied + 1;
    end if;
  end loop;

  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return jsonb_build_object('ok', true, 'applied', v_applied, 'server_time', now());
end;
$$;

grant execute on function public.rpc_kiosk_pair(text) to anon, authenticated;
grant execute on function public.rpc_kiosk_pull(uuid, timestamptz) to anon, authenticated;
grant execute on function public.rpc_kiosk_push(uuid, jsonb) to anon, authenticated;
