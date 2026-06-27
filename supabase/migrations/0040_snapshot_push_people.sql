-- Recreated FROM THE LIVE defs (on the 0039 base): snapshot now carries people + person
-- routines; push accepts person_completions (no rewards).

create or replace function public.kiosk_snapshot(p_household uuid, p_since timestamp with time zone)
 returns jsonb language sql stable security definer set search_path to ''
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
      where coalesce(c.household_id, p.household_id) = p_household
        and ((p_since is null and r.deleted_at is null)
             or (p_since is not null and r.updated_at > p_since))
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.order_index)
      from public.routine_steps s
      join public.routines r on r.id = s.routine_id
      left join public.children c on c.id = r.child_id
      left join public.people p on p.id = r.person_id
      where coalesce(c.household_id, p.household_id) = p_household
        and ((p_since is null and s.deleted_at is null)
             or (p_since is not null and s.updated_at > p_since))
    ), '[]'::jsonb),
    'chores', coalesce((
      select jsonb_agg(to_jsonb(ch) order by ch.sort_order)
      from public.chores ch
      join public.children c on c.id = ch.child_id
      where c.household_id = p_household
        and ((p_since is null and ch.deleted_at is null)
             or (p_since is not null and ch.updated_at > p_since))
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

-- rpc_kiosk_push: + person_completions handler (no rewards). See repo for the full body;
-- applied via migration 0040_snapshot_push_people. The only change vs the prior version is a
-- new v_person declaration and the person_completions loop (inserted before redemptions).
