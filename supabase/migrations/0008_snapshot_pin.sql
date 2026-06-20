-- Harbor — include the household parent PIN hash in the kiosk snapshot so the
-- wall can adopt a PIN the parent sets remotely (companion app). The hash is a
-- SHA-256 of a short PIN; only the paired device (holding the device_secret)
-- can read it, so exposure is limited to the household's own wall.

create or replace function public.kiosk_snapshot(p_household uuid, p_since timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'household', (
      select jsonb_build_object(
        'id', h.id, 'name', h.name, 'plus_active', h.plus_active,
        'parent_pin_set', (h.parent_pin_hash is not null),
        'parent_pin_hash', h.parent_pin_hash
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
