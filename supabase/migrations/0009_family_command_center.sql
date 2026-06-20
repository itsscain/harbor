-- Harbor — Family Command Center
-- Additive only. Four+1 household-scoped tables (events, store_items, list_items,
-- wall_messages, reminders) following the calm_tools pattern (updated_at trigger,
-- deleted_at tombstone, household-scoped RLS). Plus nullable columns on existing
-- tables that ride into the kiosk snapshot automatically via to_jsonb(row).
-- The kiosk stays read-only except list_items (one guarded, idempotent write path).

-- ── households: settings jsonb (idle/screensaver/home-photo, etc.) ───────────
alter table public.households add column if not exists settings jsonb not null default '{}'::jsonb;

-- ── events: shared family calendar / wall agenda (read-only on the wall) ──────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade, -- null = whole family
  title text not null,
  emoji text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  person_label text,
  color text,
  responsible_label text,
  recurrence_rule text,            -- simple rule expanded on-device
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index events_household_starts_idx on public.events (household_id, starts_at);

-- ── store_items: reward store / token-board goals ────────────────────────────
create table public.store_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade, -- null = all kids
  label text not null,
  emoji text,
  image_url text,
  cost_points int not null default 0 check (cost_points >= 0),
  kind text not null default 'reward', -- reward|screen_time|allowance|goal
  sort_order int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index store_items_household_idx on public.store_items (household_id);
create index store_items_child_idx on public.store_items (child_id);

-- reward_log records which catalog item was redeemed (additive, nullable)
alter table public.reward_log
  add column if not exists store_item_id uuid references public.store_items (id) on delete set null;
create index if not exists reward_log_store_item_idx on public.reward_log (store_item_id);

-- ── list_items: shared grocery / quick lists (the one new wall write path) ────
create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  list_kind text not null default 'grocery',
  name text not null,
  category text,
  quantity text,
  checked boolean not null default false,
  added_by_label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index list_items_household_idx on public.list_items (household_id, list_kind, checked);

-- ── wall_messages: parent-to-wall notes / nudges (read-only on the wall) ──────
create table public.wall_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade, -- null = whole family
  body text not null,
  emoji text,
  author_label text,
  pinned boolean not null default false,
  bonus_points int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index wall_messages_household_idx on public.wall_messages (household_id, expires_at);

-- ── reminders: low-frequency due-date nudges (read-only on the wall) ──────────
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  title text not null,
  due_date date not null,
  repeat_rule text,
  done boolean not null default false,
  snoozed_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index reminders_household_due_idx on public.reminders (household_id, due_date);

-- ── nullable scheduling columns on existing tables (ride to_jsonb into snapshot)
alter table public.routines add column if not exists start_time time;
alter table public.routines add column if not exists end_time time;
alter table public.routines add column if not exists days_of_week int[];
alter table public.routine_steps add column if not exists start_time time;
alter table public.routine_steps add column if not exists duration_min int;

-- ── updated_at triggers on the new tables ────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['events','store_items','list_items','wall_messages','reminders'] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ── RLS (household-scoped, mirrors calm_tools_all) ───────────────────────────
do $$
declare t text;
begin
  foreach t in array array['events','store_items','list_items','wall_messages','reminders'] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

create policy events_all on public.events for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
create policy store_items_all on public.store_items for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
create policy list_items_all on public.list_items for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
create policy wall_messages_all on public.wall_messages for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
create policy reminders_all on public.reminders for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

-- ── kiosk_snapshot: add household.settings + 5 new household-scoped arrays ────
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
    'server_time', now()
  );
$$;
revoke execute on function public.kiosk_snapshot(uuid, timestamptz) from public, anon, authenticated;

-- ── rpc_kiosk_push: redemption store_item_id passthrough + guarded list_ops ───
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
      insert into public.reward_log (child_id, delta, reason, store_item_id, created_at)
      values (v_child, -v_points,
              coalesce(v_item ->> 'label', v_item ->> 'reason', 'reward'),
              nullif(v_item ->> 'store_item_id', '')::uuid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()));
      insert into public.rewards (child_id, points_total) values (v_child, 0)
        on conflict (child_id) do nothing;
      update public.rewards set points_total = greatest(0, points_total - v_points) where child_id = v_child;
      v_applied := v_applied + 1;
    end if;
  end loop;

  -- Shared lists: the only new wall write path. Every op is scoped to the
  -- device's household; adds are idempotent via the client-supplied id.
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
$$;
