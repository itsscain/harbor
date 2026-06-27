-- Real-Time §4.1/§4.3 — Broadcast-from-database. On any write to a wall-visible table,
-- push a tiny data-free nudge to the household's topic (public, UUID-named). The wall
-- and the parent app pull the delta over the existing authenticated path; nothing
-- sensitive rides the channel (§10). One mechanism covers every writer (parent Server
-- Actions, wall push via rpc_kiosk_push, providers, admin).

create or replace function public.kiosk_broadcast() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec record;
  hh uuid;
  tbl text := tg_table_name;
begin
  if tg_op = 'DELETE' then rec := old; else rec := new; end if;

  if tbl in ('children','people','chores','calm_tools','house_rules','events','store_items',
             'list_items','wall_messages','reminders','meals','groundings','corners',
             'medications','medication_logs','skill_progress','person_completions') then
    hh := rec.household_id;
  elsif tbl = 'routines' then
    hh := coalesce(
      (select household_id from public.children where id = rec.child_id),
      (select household_id from public.people where id = rec.person_id)
    );
  elsif tbl = 'routine_steps' then
    select coalesce(c.household_id, p.household_id) into hh
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
      true  -- private topic; receipt is gated by the realtime.messages RLS policy (0046).
            -- Supabase DB-broadcast only fans out over the authorized path, so this MUST
            -- be true; the nudge is still data-free. Topic = household UUID.
    );
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'children','people','routines','routine_steps','chores','rewards','reward_log','check_ins',
    'calm_tools','house_rules','events','store_items','list_items','wall_messages','reminders',
    'meals','groundings','corners','medications','medication_logs','skill_progress','person_completions'
  ] loop
    execute format('drop trigger if exists kiosk_broadcast_t on public.%I', t);
    execute format('create trigger kiosk_broadcast_t after insert or update or delete on public.%I for each row execute function public.kiosk_broadcast()', t);
  end loop;
end $$;
