-- Corrective to 0045: Supabase DB-broadcast only delivers over the authorized (private)
-- path, so the nudge must be sent with private = true. Receipt is gated by the
-- realtime.messages RLS policy from 0046 (anon + authenticated may receive hh:* nudges).
-- Verified end-to-end: a private-channel anon subscriber receives the nudge; a public
-- one does not. The nudge stays data-free; the topic is the household UUID.
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
      true
    );
  end if;
  return null;
end $$;

-- It's a trigger function, never an RPC — don't expose it on the REST API. (Triggers
-- still fire regardless of EXECUTE grants; this only blocks /rest/v1/rpc/kiosk_broadcast.)
revoke execute on function public.kiosk_broadcast() from anon, authenticated, public;
