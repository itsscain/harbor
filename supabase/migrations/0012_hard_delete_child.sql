-- Harbor — permanent child deletion with wall propagation.
-- A hard DELETE removes the child + (via ON DELETE CASCADE) all routines, steps,
-- rewards, reward_log, check_ins, and child-scoped events/store_items/messages.
-- But the kiosk only drops a child when it sees a tombstone in a delta pull — a
-- vanished row never reaches it. So we record a lightweight deletion tombstone the
-- kiosk consumes, then cascade-delete.

create table if not exists public.kiosk_deletions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  deleted_at timestamptz not null default now()
);
create index if not exists kiosk_deletions_hh_time
  on public.kiosk_deletions (household_id, deleted_at);

alter table public.kiosk_deletions enable row level security;
drop policy if exists kiosk_deletions_all on public.kiosk_deletions;
create policy kiosk_deletions_all on public.kiosk_deletions
  for all
  using (public.household_is_mine(household_id) or public.is_admin())
  with check (public.household_is_mine(household_id) or public.is_admin());

-- Permanently delete a child the caller owns: record a tombstone, then cascade.
create or replace function public.hard_delete_child(p_child uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_household uuid;
begin
  select household_id into v_household from public.children where id = p_child;
  if v_household is null then
    return; -- already gone
  end if;
  if not (public.child_is_mine(p_child) or public.is_admin()) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  insert into public.kiosk_deletions (household_id, entity, entity_id)
  values (v_household, 'child', p_child);
  delete from public.children where id = p_child; -- cascades to dependents
end;
$$;
revoke execute on function public.hard_delete_child(uuid) from public, anon;
grant execute on function public.hard_delete_child(uuid) to authenticated;

-- Rebuild the snapshot (exact 0011 body) + a `deletions` key so a paired wall
-- removes hard-deleted children on its next delta sync.
create or replace function public.kiosk_snapshot(p_household uuid, p_since timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
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
$$;
revoke execute on function public.kiosk_snapshot(uuid, timestamptz) from public, anon, authenticated;
