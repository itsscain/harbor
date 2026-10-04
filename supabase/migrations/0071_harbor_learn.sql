-- Harbor Learn — per-child learning on the wall (reading, code, math).
-- Content is code bundled with the wall (works offline); only these three tables hold data:
--   learn_profiles     grade level + settings per child (parent-edited)
--   learn_assignments  lessons a parent assigned
--   learn_results      one row per finished lesson (written ONLY by rpc_learn_sync)
-- The wall syncs through its own RPC so the core kiosk push/pull stay untouched.

create table if not exists public.learn_profiles (
  child_id uuid primary key references public.children(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  grade text not null default 'k' check (grade in ('prek', 'k', '1', '2', '3')),
  subjects text[] not null default array['reading', 'code', 'math'],
  daily_goal smallint not null default 2 check (daily_goal between 1 and 10),
  earn_stars boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learn_assignments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  lesson_id text not null check (length(lesson_id) between 1 and 80),
  note text check (note is null or length(note) <= 140),
  status text not null default 'assigned' check (status in ('assigned', 'done')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists learn_assignments_child_idx on public.learn_assignments (child_id) where status = 'assigned' and deleted_at is null;
create index if not exists learn_assignments_household_idx on public.learn_assignments (household_id);

create table if not exists public.learn_results (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  lesson_id text not null check (length(lesson_id) between 1 and 80),
  subject text not null check (subject in ('reading', 'code', 'math')),
  stars smallint not null check (stars between 0 and 3),
  correct smallint not null default 0,
  total smallint not null default 0,
  duration_sec integer not null default 0,
  sticker text check (sticker is null or length(sticker) <= 40),
  completed_at timestamptz not null,
  client_op_id text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists learn_results_child_idx on public.learn_results (child_id, completed_at desc);
create index if not exists learn_results_household_idx on public.learn_results (household_id, completed_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.learn_profiles enable row level security;
alter table public.learn_assignments enable row level security;
alter table public.learn_results enable row level security;

drop policy if exists learn_profiles_all on public.learn_profiles;
create policy learn_profiles_all on public.learn_profiles for all to authenticated
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or (public.household_is_mine(household_id) and public.child_is_mine(child_id)));

drop policy if exists learn_assignments_all on public.learn_assignments;
create policy learn_assignments_all on public.learn_assignments for all to authenticated
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or (public.household_is_mine(household_id) and public.child_is_mine(child_id)));

-- Results are read by parents; only the wall's RPC writes them (no insert/update policy).
drop policy if exists learn_results_read on public.learn_results;
create policy learn_results_read on public.learn_results for select to authenticated
  using ((select public.is_admin()) or public.household_is_mine(household_id));

-- ── Triggers: updated_at + the <1s "changed" nudge to walls and phones ────────
drop trigger if exists set_updated_at on public.learn_profiles;
create trigger set_updated_at before update on public.learn_profiles for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.learn_assignments;
create trigger set_updated_at before update on public.learn_assignments for each row execute function public.set_updated_at();

drop trigger if exists kiosk_broadcast_t on public.learn_profiles;
create trigger kiosk_broadcast_t after insert or update or delete on public.learn_profiles for each row execute function public.kiosk_broadcast();
drop trigger if exists kiosk_broadcast_t on public.learn_assignments;
create trigger kiosk_broadcast_t after insert or update or delete on public.learn_assignments for each row execute function public.kiosk_broadcast();
drop trigger if exists kiosk_broadcast_t on public.learn_results;
create trigger kiosk_broadcast_t after insert on public.learn_results for each row execute function public.kiosk_broadcast();

-- kiosk_broadcast maps each table to its household; teach it the learn tables.
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
             'schedule_templates','routine_child_overrides','wall_commands','requests',
             'learn_profiles','learn_assignments','learn_results') then
    hh := rec.household_id;
  elsif tbl = 'households' then
    hh := rec.id;
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

-- ── What the wall needs: profiles, open assignments, and each kid's progress ──
create or replace function public.learn_snapshot(p_household uuid, p_tz text)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object('child_id', p.child_id, 'grade', p.grade, 'subjects', to_jsonb(p.subjects), 'daily_goal', p.daily_goal, 'earn_stars', p.earn_stars))
      from public.learn_profiles p join public.children c on c.id = p.child_id
      where c.household_id = p_household and c.deleted_at is null), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'child_id', a.child_id, 'lesson_id', a.lesson_id, 'note', a.note, 'created_at', a.created_at) order by a.created_at)
      from public.learn_assignments a
      where a.household_id = p_household and a.status = 'assigned' and a.deleted_at is null), '[]'::jsonb),
    'kids', coalesce((
      select jsonb_object_agg(k.child_id::text, jsonb_build_object(
        'lessons', coalesce((select jsonb_object_agg(x.lesson_id, jsonb_build_array(x.best, x.plays, x.last))
                    from (select lesson_id, max(stars) as best, count(*) as plays, max(completed_at) as last
                          from public.learn_results where child_id = k.child_id group by lesson_id) x), '{}'::jsonb),
        'stickers', coalesce((select jsonb_object_agg(y.sticker, y.n)
                    from (select sticker, count(*) as n from public.learn_results
                          where child_id = k.child_id and sticker is not null group by sticker) y), '{}'::jsonb),
        'days', coalesce((select jsonb_agg(z.d order by z.d desc)
                    from (select distinct ((completed_at at time zone p_tz)::date)::text as d from public.learn_results
                          where child_id = k.child_id and completed_at > now() - interval '120 days') z), '[]'::jsonb),
        'xp', (select coalesce(sum(10 + 5 * stars), 0) from public.learn_results where child_id = k.child_id)
      ))
      from (select distinct r.child_id from public.learn_results r
            join public.children c on c.id = r.child_id
            where r.household_id = p_household and c.deleted_at is null) k), '{}'::jsonb),
    'server_time', now()
  );
$function$;

-- Internal: only callable from the RPC below (it trusts its household argument).
revoke all on function public.learn_snapshot(uuid, text) from public, anon, authenticated;

-- ── The wall's Learn sync: push finished lessons, get the latest Learn state back ──
create or replace function public.rpc_learn_sync(p_secret uuid, p_results jsonb default '[]'::jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_household uuid;
  v_tz text;
  v_item jsonb;
  v_child uuid;
  v_lesson text;
  v_op text;
  v_stars int;
  v_completed timestamptz;
  v_inserted uuid;
  v_earn boolean;
  v_today int;
  v_award int;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;
  select coalesce(nullif(settings ->> 'timezone', ''), 'America/New_York') into v_tz from public.households where id = v_household;

  for v_item in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) limit 200 loop
    begin
      v_child := nullif(v_item ->> 'child_id', '')::uuid;
      v_lesson := left(nullif(v_item ->> 'lesson_id', ''), 80);
      v_op := left(nullif(v_item ->> 'op_id', ''), 120);
      continue when v_child is null or v_lesson is null or v_op is null;
      continue when not exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household and c.deleted_at is null);
      v_stars := greatest(0, least(3, coalesce((v_item ->> 'stars')::int, 0)));
      v_completed := least(coalesce((v_item ->> 'completed_at')::timestamptz, now()), now() + interval '2 minutes');
      v_inserted := null;

      insert into public.learn_results (household_id, child_id, lesson_id, subject, stars, correct, total, duration_sec, sticker, completed_at, client_op_id)
      values (
        v_household, v_child, v_lesson,
        case when v_item ->> 'subject' in ('reading', 'code', 'math') then v_item ->> 'subject' else 'reading' end,
        v_stars,
        greatest(0, least(500, coalesce((v_item ->> 'correct')::int, 0))),
        greatest(0, least(500, coalesce((v_item ->> 'total')::int, 0))),
        greatest(0, least(7200, coalesce((v_item ->> 'duration_sec')::int, 0))),
        left(nullif(v_item ->> 'sticker', ''), 40),
        v_completed, v_op
      )
      on conflict (client_op_id) do nothing
      returning id into v_inserted;

      if v_inserted is not null then
        update public.learn_assignments set status = 'done', completed_at = v_completed
        where child_id = v_child and lesson_id = v_lesson and status = 'assigned' and deleted_at is null;

        -- A few wall-store stars (parents can turn this off): 1 per lesson, 2 for a perfect one,
        -- at most 10 a day — learning is the point, not grinding.
        select coalesce((select earn_stars from public.learn_profiles where child_id = v_child), true) into v_earn;
        if v_earn and v_stars >= 1 then
          select coalesce(sum(delta), 0) into v_today from public.reward_log
          where child_id = v_child and reason = 'learn' and deleted_at is null
            and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date;
          v_award := least(case when v_stars >= 3 then 2 else 1 end, greatest(0, 10 - v_today));
          if v_award > 0 then
            insert into public.reward_log (child_id, delta, reason, client_op_id, created_at)
            values (v_child, v_award, 'learn', 'learn:' || v_op, v_completed)
            on conflict (client_op_id) do nothing;
            if found then
              insert into public.rewards (child_id, points_total) values (v_child, 0) on conflict (child_id) do nothing;
              update public.rewards set points_total = points_total + v_award where child_id = v_child;
            end if;
          end if;
        end if;
      end if;
    exception when others then
      continue; -- one malformed item never blocks the rest
    end;
  end loop;

  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return public.learn_snapshot(v_household, v_tz);
end;
$function$;

revoke all on function public.rpc_learn_sync(uuid, jsonb) from public;
grant execute on function public.rpc_learn_sync(uuid, jsonb) to anon, authenticated;
