-- House Rules + consequence ladder: a calm, shared reference shown on the wall.
-- kind='rule' (the rules) and kind='consequence' (the step-by-step ladder).
create table if not exists public.house_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null default 'rule' check (kind in ('rule', 'consequence')),
  title text not null,
  detail text,
  emoji text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists house_rules_household_idx on public.house_rules(household_id) where deleted_at is null;

alter table public.house_rules enable row level security;

create policy house_rules_all on public.house_rules for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

create trigger set_updated_at_house_rules
  before update on public.house_rules
  for each row execute function public.set_updated_at();

-- Rebuild kiosk_snapshot to flow house_rules to the wall (household-level delta).
-- (Same body as 0018 with the 'house_rules' key added after 'calm_tools'.)
CREATE OR REPLACE FUNCTION public.kiosk_snapshot(p_household uuid, p_since timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
