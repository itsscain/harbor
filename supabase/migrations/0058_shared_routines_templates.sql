-- Routines & App Phase 2 (§2-§4): family-wide scheduling — define once, apply to all.
-- 1) schedule_templates: reusable named windows (household-scoped).
-- 2) routine_child_overrides: per-child tweaks on a shared routine (time offset / enable).
-- 3) routines: scope ('child'|'shared'), assigned_child_ids, schedule_template_id, and a
--    direct household_id anchor (backfilled + trigger-maintained) so shared routines are
--    visible to the snapshot, the broadcast nudge, and RLS.
-- 4) Wholesale rebuilds FROM THE LIVE DEFS (0042/0044 lesson): kiosk_snapshot (+2 arrays,
--    household coalesce), rpc_kiosk_push (completions/skill validate shared assignment),
--    kiosk_broadcast (+2 tables, household coalesce), routine_is_mine, and routines_all
--    (which also fixes the pre-existing person-routine RLS hole: child_is_mine(null)=false).

-- ── 1. schedule_templates ────────────────────────────────────────────────────
create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  start_time time,
  end_time time,
  days_of_week int[],
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists schedule_templates_hh_updated_idx
  on public.schedule_templates (household_id, updated_at);
alter table public.schedule_templates enable row level security;
drop policy if exists schedule_templates_all on public.schedule_templates;
create policy schedule_templates_all on public.schedule_templates for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
drop trigger if exists set_updated_at on public.schedule_templates;
create trigger set_updated_at before update on public.schedule_templates
  for each row execute function public.set_updated_at();

-- ── 2. routine_child_overrides ───────────────────────────────────────────────
create table if not exists public.routine_child_overrides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  time_offset_min int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (routine_id, child_id)
);
create index if not exists routine_child_overrides_hh_updated_idx
  on public.routine_child_overrides (household_id, updated_at);
create index if not exists routine_child_overrides_child_idx
  on public.routine_child_overrides (child_id);
alter table public.routine_child_overrides enable row level security;
drop policy if exists routine_child_overrides_all on public.routine_child_overrides;
create policy routine_child_overrides_all on public.routine_child_overrides for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));
drop trigger if exists set_updated_at on public.routine_child_overrides;
create trigger set_updated_at before update on public.routine_child_overrides
  for each row execute function public.set_updated_at();

-- ── 3. routines: scope + assignment + template ref + household anchor ────────
alter table public.routines add column if not exists scope text not null default 'child';
do $$ begin
  alter table public.routines add constraint routines_scope_chk check (scope in ('child','shared'));
exception when duplicate_object then null; end $$;
alter table public.routines add column if not exists assigned_child_ids uuid[];
alter table public.routines add column if not exists schedule_template_id uuid
  references public.schedule_templates(id) on delete set null;
create index if not exists routines_template_idx on public.routines (schedule_template_id);
alter table public.routines add column if not exists household_id uuid
  references public.households(id) on delete cascade;
update public.routines r set household_id = coalesce(
  (select household_id from public.children c where c.id = r.child_id),
  (select household_id from public.people p where p.id = r.person_id))
where r.household_id is null;
create index if not exists routines_household_idx on public.routines (household_id);

-- Keep household_id fresh on insert/update (existing actions don't set it).
create or replace function public.routines_set_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.household_id is null then
    new.household_id := coalesce(
      (select household_id from public.children where id = new.child_id),
      (select household_id from public.people where id = new.person_id));
  end if;
  return new;
end $$;
revoke execute on function public.routines_set_household() from public, anon, authenticated;
drop trigger if exists routines_set_household_t on public.routines;
create trigger routines_set_household_t before insert or update on public.routines
  for each row execute function public.routines_set_household();

-- Exactly one owner for child-scoped; no owner + a household for shared.
alter table public.routines drop constraint if exists routines_owner_chk;
alter table public.routines add constraint routines_owner_chk check (
  (scope = 'child' and ((child_id is not null)::int + (person_id is not null)::int = 1))
  or
  (scope = 'shared' and child_id is null and person_id is null and household_id is not null)
);

-- ── 4a. RLS: routines_all via the household anchor (fixes person-routine hole) ─
drop policy if exists routines_all on public.routines;
create policy routines_all on public.routines for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

create or replace function public.routine_is_mine(r uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.routines rt
    where rt.id = r and public.household_is_mine(rt.household_id)
  );
$$;

-- ── 4b. kiosk_snapshot rebuild (from the LIVE def) ───────────────────────────
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

-- ── 4c. rpc_kiosk_push rebuild: completions + skill_progress accept shared routines ─
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

  -- Completions: a step counts for a child if the routine is theirs OR it's a shared
  -- routine of this household with the child assigned (Phase 2 §2.1).
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
               and v_child = any(coalesce(r.assigned_child_ids, '{}'::uuid[]))));
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

-- ── 4d. kiosk_broadcast rebuild + triggers on the new tables ─────────────────
create or replace function public.kiosk_broadcast()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  rec record;
  hh uuid;
  tbl text := tg_table_name;
begin
  if tg_op = 'DELETE' then rec := old; else rec := new; end if;

  if tbl in ('children','people','chores','calm_tools','house_rules','events','store_items',
             'list_items','wall_messages','reminders','meals','groundings','corners',
             'medications','medication_logs','skill_progress','person_completions',
             'schedule_templates','routine_child_overrides') then
    hh := rec.household_id;
  elsif tbl = 'routines' then
    hh := coalesce(
      (select household_id from public.children where id = rec.child_id),
      (select household_id from public.people where id = rec.person_id),
      rec.household_id
    );
  elsif tbl = 'routine_steps' then
    select coalesce(c.household_id, p.household_id, r.household_id) into hh
    from public.routines r
    left join public.children c on c.id = r.child_id
    left join public.people p on p.id = r.person_id
    where r.id = rec.routine_id;
  elsif tbl in ('rewards','check_ins','reward_log') then
    hh := (select household_id from public.children where id = rec.child_id);
  end if;

  if hh is not null then
    perform realtime.send(
      jsonb_build_object('t', 'changed', 'tbl', tbl, 'at', extract(epoch from clock_timestamp())),
      'changed',
      'hh:' || hh::text,
      true
    );
  end if;
  return null;
end $function$;
revoke execute on function public.kiosk_broadcast() from public, anon, authenticated;

drop trigger if exists kiosk_broadcast_t on public.schedule_templates;
create trigger kiosk_broadcast_t after insert or update or delete on public.schedule_templates
  for each row execute function public.kiosk_broadcast();
drop trigger if exists kiosk_broadcast_t on public.routine_child_overrides;
create trigger kiosk_broadcast_t after insert or update or delete on public.routine_child_overrides
  for each row execute function public.kiosk_broadcast();
