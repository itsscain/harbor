-- Harbor — Skylight-parity additions
-- Per-person color identity, meal planner, and countdown events. Additive only.

-- Per-child color (the signature glanceability cue). Rides to_jsonb into snapshot.
alter table public.children add column if not exists color text;

-- Countdown flag on events (birthdays/vacations). Rides to_jsonb into snapshot.
alter table public.events add column if not exists is_countdown boolean not null default false;

-- ── meals: weekly meal planner (read-only on the wall; parent edits in /app) ──
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  meal_type text not null default 'dinner',  -- breakfast|lunch|dinner|snack
  title text not null,
  emoji text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index meals_household_date_idx on public.meals (household_id, date);

create trigger set_updated_at before update on public.meals
  for each row execute function public.set_updated_at();

alter table public.meals enable row level security;
create policy meals_all on public.meals for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

-- ── kiosk_snapshot: add meals (children/events ride to_jsonb automatically) ───
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
    'server_time', now()
  );
$$;
revoke execute on function public.kiosk_snapshot(uuid, timestamptz) from public, anon, authenticated;
