-- Phase 2 review hardening (Routines & App P2):
-- 1) reset_household: also clear household-anchored routines (shared + person),
--    schedule templates, and people — a "fresh start" must not leave ghost shared
--    routines flowing into every kiosk snapshot.
-- 2) hard_delete_child: strip the child's uuid from shared routines' assigned_child_ids
--    (uuid[] has no FK; stale ids are dormant garbage).
-- 3) rpc_kiosk_push: completions/skill_progress now respect a per-child
--    routine_child_overrides.enabled = false — the parent's "off for them" is enforced
--    server-side, not just on the wall.

-- ── 1. reset_household (rebuilt from the LIVE def) ───────────────────────────
create or replace function public.reset_household(p_household uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.household_is_mine(p_household) or public.is_admin()) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  insert into public.kiosk_deletions (household_id, entity, entity_id)
  select p_household, 'child', id from public.children where household_id = p_household;
  delete from public.children where household_id = p_household;
  -- Shared + person routines carry household_id and survive the children cascade;
  -- steps + overrides cascade off routines. Templates + people are household rows.
  delete from public.routines where household_id = p_household;
  delete from public.schedule_templates where household_id = p_household;
  delete from public.people where household_id = p_household;
  delete from public.events where household_id = p_household;
  delete from public.store_items where household_id = p_household;
  delete from public.list_items where household_id = p_household;
  delete from public.wall_messages where household_id = p_household;
  delete from public.reminders where household_id = p_household;
  delete from public.meals where household_id = p_household;
  delete from public.calm_tools where household_id = p_household;
  update public.households set settings = '{}'::jsonb where id = p_household;
end $function$;

-- ── 2. hard_delete_child (rebuilt from the LIVE def) ─────────────────────────
create or replace function public.hard_delete_child(p_child uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare v_household uuid;
begin
  select household_id into v_household from public.children where id = p_child;
  if v_household is null then
    return;
  end if;
  if not (public.child_is_mine(p_child) or public.is_admin()) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  -- Unassign from shared routines first — uuid[] has no FK to cascade for us.
  update public.routines
     set assigned_child_ids = array_remove(assigned_child_ids, p_child)
   where household_id = v_household and assigned_child_ids @> array[p_child];
  insert into public.kiosk_deletions (household_id, entity, entity_id)
  values (v_household, 'child', p_child);
  delete from public.children where id = p_child;
end;
$function$;

-- ── 3. rpc_kiosk_push: honor per-child disable on shared routines ────────────
create or replace function public.rpc_kiosk_push(p_secret uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_household uuid;
  v_item jsonb;
  v_child uuid;
  v_person uuid;
  v_med uuid;
  v_step uuid;
  v_chore uuid;
  v_opid text;
  v_points int;
  v_applied int := 0;
  v_future timestamptz := now() + interval '2 minutes';
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'check_ins', '[]'::jsonb)) loop
    v_child := (v_item ->> 'child_id')::uuid;
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.check_ins (child_id, feeling, note, created_at)
      values (v_child, coalesce(v_item ->> 'feeling', 'unknown'), v_item ->> 'note',
              coalesce((v_item ->> 'created_at')::timestamptz, now()));
      v_applied := v_applied + 1;
    end if;
  end loop;

  -- Completions: the routine is the child's own, OR shared + assigned + not disabled
  -- for them (Phase 2 §2.1/§2.3 — the parent's per-child "off" is enforced here too).
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'completions', '[]'::jsonb)) loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future;
    v_child := (v_item ->> 'child_id')::uuid;
    v_step := nullif(v_item ->> 'step_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');
    select s.reward_points into v_points
    from public.routine_steps s
    join public.routines r on r.id = s.routine_id
    join public.children c on c.id = v_child and c.household_id = v_household
    where s.id = v_step and s.deleted_at is null
      and (r.child_id = v_child
           or (r.scope = 'shared' and r.household_id = v_household
               and v_child = any(coalesce(r.assigned_child_ids, '{}'::uuid[]))))
      and not exists (select 1 from public.routine_child_overrides o
                      where o.routine_id = r.id and o.child_id = v_child
                        and o.deleted_at is null and not o.enabled);
    if found then
      insert into public.reward_log (child_id, delta, reason, step_id, client_op_id, created_at)
      values (v_child, v_points, 'step', v_step, v_opid, coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0) on conflict (child_id) do nothing;
        update public.rewards set points_total = points_total + v_points where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'chore_dones', '[]'::jsonb)) loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future;
    v_child := (v_item ->> 'child_id')::uuid;
    v_chore := nullif(v_item ->> 'chore_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');
    select ch.points into v_points
    from public.chores ch
    where ch.id = v_chore and ch.household_id = v_household and ch.deleted_at is null
      and (ch.child_id = v_child or (ch.rotation_member_ids is not null and ch.rotation_member_ids @> to_jsonb(v_child::text)))
      and exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household);
    if found then
      insert into public.reward_log (child_id, delta, reason, chore_id, client_op_id, created_at)
      values (v_child, v_points, 'chore', v_chore, v_opid, coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0) on conflict (child_id) do nothing;
        update public.rewards set points_total = points_total + v_points where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'person_completions', '[]'::jsonb)) loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future;
    v_person := (v_item ->> 'person_id')::uuid;
    v_step := nullif(v_item ->> 'step_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');
    if exists (select 1 from public.people pe where pe.id = v_person and pe.household_id = v_household) then
      insert into public.person_completions (household_id, person_id, step_id, client_op_id, created_at)
      values (v_household, v_person, v_step, v_opid, coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then v_applied := v_applied + 1; end if;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'med_logs', '[]'::jsonb)) loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future;
    v_child := (v_item ->> 'child_id')::uuid;
    v_med := nullif(v_item ->> 'medication_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');
    if exists (select 1 from public.medications md join public.children c on c.id = md.child_id
               where md.id = v_med and c.id = v_child and c.household_id = v_household) then
      insert into public.medication_logs
        (household_id, child_id, medication_id, dose_date, dose_time, status, confirmed_by, client_op_id, taken_at, created_at)
      values (v_household, v_child, v_med,
              coalesce((v_item ->> 'dose_date')::date, current_date),
              nullif(v_item ->> 'dose_time', ''),
              coalesce(v_item ->> 'status', 'taken'),
              nullif(v_item ->> 'confirmed_by', ''),
              v_opid,
              coalesce((v_item ->> 'taken_at')::timestamptz, now()),
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then v_applied := v_applied + 1; end if;
    end if;
  end loop;

  -- Skill independence (§4.4) — wall-computed earned levels; upsert, never decreases level.
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'skill_progress', '[]'::jsonb)) loop
    v_child := (v_item ->> 'child_id')::uuid;
    v_step := nullif(v_item ->> 'step_id', '')::uuid;
    if exists (
      select 1 from public.routine_steps s
      join public.routines r on r.id = s.routine_id
      join public.children c on c.id = v_child and c.household_id = v_household
      where s.id = v_step
        and (r.child_id = v_child
             or (r.scope = 'shared' and r.household_id = v_household
                 and v_child = any(coalesce(r.assigned_child_ids, '{}'::uuid[]))))
        and not exists (select 1 from public.routine_child_overrides o
                        where o.routine_id = r.id and o.child_id = v_child
                          and o.deleted_at is null and not o.enabled)
    ) then
      insert into public.skill_progress as sp (household_id, child_id, step_id, streak, level_earned, last_date)
      values (v_household, v_child, v_step,
              coalesce((v_item ->> 'streak')::int, 0),
              coalesce((v_item ->> 'level_earned')::int, 0),
              nullif(v_item ->> 'last_date', '')::date)
      on conflict (child_id, step_id) do update
        set streak = excluded.streak,
            level_earned = greatest(sp.level_earned, excluded.level_earned),
            last_date = excluded.last_date,
            updated_at = now();
      v_applied := v_applied + 1;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'redemptions', '[]'::jsonb)) loop
    continue when coalesce((v_item ->> 'created_at')::timestamptz, now()) > v_future;
    v_child := (v_item ->> 'child_id')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '');
    v_points := abs(coalesce((v_item ->> 'points')::int, 0));
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.reward_log (child_id, delta, reason, store_item_id, client_op_id, created_at)
      values (v_child, -v_points, coalesce(v_item ->> 'label', v_item ->> 'reason', 'reward'),
              nullif(v_item ->> 'store_item_id', '')::uuid, v_opid, coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0) on conflict (child_id) do nothing;
        update public.rewards set points_total = greatest(0, points_total - v_points) where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'list_ops', '[]'::jsonb)) loop
    if (v_item ->> 'op') = 'add' then
      insert into public.list_items (id, household_id, list_kind, name, category, quantity, added_by_label, created_at)
      values (coalesce(nullif(v_item ->> 'client_id', '')::uuid, gen_random_uuid()), v_household,
              coalesce(v_item ->> 'list_kind', 'grocery'), coalesce(v_item ->> 'name', 'Item'),
              v_item ->> 'category', v_item ->> 'quantity', v_item ->> 'added_by_label',
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (id) do nothing;
      v_applied := v_applied + 1;
    elsif (v_item ->> 'op') = 'check' then
      update public.list_items set checked = coalesce((v_item ->> 'checked')::boolean, true), updated_at = now()
      where id = (v_item ->> 'id')::uuid and household_id = v_household;
      v_applied := v_applied + 1;
    end if;
  end loop;

  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return jsonb_build_object('ok', true, 'applied', v_applied, 'server_time', now());
end;
$function$;
revoke execute on function public.rpc_kiosk_push(uuid, jsonb) from public;
grant execute on function public.rpc_kiosk_push(uuid, jsonb) to anon, authenticated;
