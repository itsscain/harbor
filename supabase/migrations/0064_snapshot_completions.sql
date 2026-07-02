-- Cross-device done-state (Lantern ↔ wall realtime). The snapshot synced POINTS but not
-- WHICH steps/chores are checked off, so a completion on one device never checked off on
-- another. This adds a `completions` array — recent step/chore completions from reward_log —
-- which the client merges (union) into its local per-child progress by the family-tz service
-- day. Rebuilt FROM THE LIVE def (repo lesson) with only the new key added before server_time.
create or replace function public.kiosk_snapshot(p_household uuid, p_since timestamp with time zone)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'household', (
      select jsonb_build_object(
        'id', h.id, 'name', h.name, 'plus_active', h.plus_active,
        'parent_pin_set', (h.parent_pin_hash is not null),
        'parent_pin_hash', h.parent_pin_hash,
        'settings', h.settings
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
    'people', coalesce((
      select jsonb_agg(to_jsonb(pe) order by pe.sort_order)
      from public.people pe
      where pe.household_id = p_household
        and ((p_since is null and pe.deleted_at is null)
             or (p_since is not null and pe.updated_at > p_since))
    ), '[]'::jsonb),
    'routines', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.sort_order)
      from public.routines r
      left join public.children c on c.id = r.child_id
      left join public.people p on p.id = r.person_id
      where coalesce(c.household_id, p.household_id, r.household_id) = p_household
        and ((p_since is null and r.deleted_at is null)
             or (p_since is not null and r.updated_at > p_since))
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.order_index)
      from public.routine_steps s
      join public.routines r on r.id = s.routine_id
      left join public.children c on c.id = r.child_id
      left join public.people p on p.id = r.person_id
      where coalesce(c.household_id, p.household_id, r.household_id) = p_household
        and ((p_since is null and s.deleted_at is null)
             or (p_since is not null and s.updated_at > p_since))
    ), '[]'::jsonb),
    'schedule_templates', coalesce((
      select jsonb_agg(to_jsonb(st) order by st.sort_order)
      from public.schedule_templates st
      where st.household_id = p_household
        and ((p_since is null and st.deleted_at is null)
             or (p_since is not null and st.updated_at > p_since))
    ), '[]'::jsonb),
    'routine_child_overrides', coalesce((
      select jsonb_agg(to_jsonb(ro))
      from public.routine_child_overrides ro
      where ro.household_id = p_household
        and ((p_since is null and ro.deleted_at is null)
             or (p_since is not null and ro.updated_at > p_since))
    ), '[]'::jsonb),
    'chores', coalesce((
      select jsonb_agg(to_jsonb(ch) order by ch.sort_order)
      from public.chores ch
      join public.children c on c.id = ch.child_id
      where c.household_id = p_household
        and ((p_since is null and ch.deleted_at is null)
             or (p_since is not null and ch.updated_at > p_since))
    ), '[]'::jsonb),
    'medications', coalesce((
      select jsonb_agg(to_jsonb(md) order by md.sort_order)
      from public.medications md
      join public.children c on c.id = md.child_id
      where c.household_id = p_household
        and ((p_since is null and md.deleted_at is null)
             or (p_since is not null and md.updated_at > p_since))
    ), '[]'::jsonb),
    'medication_logs', coalesce((
      select jsonb_agg(to_jsonb(ml))
      from public.medication_logs ml
      join public.children c on c.id = ml.child_id
      where c.household_id = p_household
        and ml.dose_date >= (current_date - 1)
        and (p_since is null or ml.created_at > p_since)
    ), '[]'::jsonb),
    'skill_progress', coalesce((
      select jsonb_agg(to_jsonb(sp))
      from public.skill_progress sp
      join public.children c on c.id = sp.child_id
      where c.household_id = p_household
        and (p_since is null or sp.updated_at > p_since)
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
    'house_rules', coalesce((
      select jsonb_agg(to_jsonb(hr) order by hr.sort_order)
      from public.house_rules hr
      where hr.household_id = p_household
        and ((p_since is null and hr.deleted_at is null)
             or (p_since is not null and hr.updated_at > p_since))
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.starts_at)
      from public.events e
      where e.household_id = p_household
        and ((p_since is null and e.deleted_at is null)
             or (p_since is not null and e.updated_at > p_since))
    ), '[]'::jsonb),
    'store_items', coalesce((
      select jsonb_agg(to_jsonb(si) order by si.sort_order)
      from public.store_items si
      where si.household_id = p_household
        and ((p_since is null and si.deleted_at is null)
             or (p_since is not null and si.updated_at > p_since))
    ), '[]'::jsonb),
    'list_items', coalesce((
      select jsonb_agg(to_jsonb(li) order by li.sort_order)
      from public.list_items li
      where li.household_id = p_household
        and ((p_since is null and li.deleted_at is null)
             or (p_since is not null and li.updated_at > p_since))
    ), '[]'::jsonb),
    'wall_messages', coalesce((
      select jsonb_agg(to_jsonb(wm) order by wm.created_at)
      from public.wall_messages wm
      where wm.household_id = p_household
        and ((p_since is null and wm.deleted_at is null)
             or (p_since is not null and wm.updated_at > p_since))
    ), '[]'::jsonb),
    'reminders', coalesce((
      select jsonb_agg(to_jsonb(rm) order by rm.due_date)
      from public.reminders rm
      where rm.household_id = p_household
        and ((p_since is null and rm.deleted_at is null)
             or (p_since is not null and rm.updated_at > p_since))
    ), '[]'::jsonb),
    'meals', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.date, m.sort_order)
      from public.meals m
      where m.household_id = p_household
        and ((p_since is null and m.deleted_at is null)
             or (p_since is not null and m.updated_at > p_since))
    ), '[]'::jsonb),
    'groundings', coalesce((
      select jsonb_agg(to_jsonb(g))
      from public.groundings g
      join public.children c on c.id = g.child_id
      where c.household_id = p_household
        and ((p_since is null and g.deleted_at is null and g.status = 'active')
             or (p_since is not null and g.updated_at > p_since))
    ), '[]'::jsonb),
    'corners', coalesce((
      select jsonb_agg(to_jsonb(co))
      from public.corners co
      join public.children c on c.id = co.child_id
      where c.household_id = p_household
        and ((p_since is null and co.deleted_at is null and co.status = 'active'
              and (co.started_at + make_interval(mins => co.duration_minutes)) > now())
             or (p_since is not null and co.updated_at > p_since))
    ), '[]'::jsonb),
    -- Cross-device done-state (union-merged client-side by family-tz service day). Always
    -- returned (not p_since-filtered) so a device reflects the current day's checkmarks even
    -- on a cheap delta pull; the array is small (a day of a household's completions).
    'completions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'child_id', rl.child_id,
        'ref', coalesce(rl.step_id, rl.chore_id),
        'kind', case when rl.step_id is not null then 'step' else 'chore' end,
        'at', rl.created_at))
      from public.reward_log rl
      join public.children c on c.id = rl.child_id
      where c.household_id = p_household
        and rl.deleted_at is null
        and rl.reason in ('step', 'chore')
        and coalesce(rl.step_id, rl.chore_id) is not null
        and rl.created_at >= (now() - interval '2 days')
    ), '[]'::jsonb),
    'deletions', case
      when p_since is null then '[]'::jsonb
      else coalesce((
        select jsonb_agg(jsonb_build_object('entity', d.entity, 'entity_id', d.entity_id))
        from public.kiosk_deletions d
        where d.household_id = p_household and d.deleted_at > p_since
      ), '[]'::jsonb)
    end,
    'server_time', now()
  );
$function$;
revoke execute on function public.kiosk_snapshot(uuid, timestamptz) from public, anon, authenticated;
