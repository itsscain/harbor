-- Founder Funnel hardening (security review): a DB-level uniqueness backstop on active
-- founder numbers (the advisory lock already prevents in-funnel collisions, but this guards
-- against any number assigned outside the locked RPC), and a guarded uuid cast so a direct
-- anon RPC call with a malformed build id can't raise an unhandled cast error.

create unique index if not exists founder_signups_active_number_uniq
  on public.founder_signups (founder_number)
  where founder_number is not null
    and status in ('reserved','approved','scheduled','invoiced','active');

create or replace function public.rpc_reserve_founder_spot(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cap int;
  v_state text;
  v_taken int;
  v_num int;
  v_status public.founder_signup_status;
  v_id uuid;
  v_name text := nullif(trim(p->>'name'), '');
  v_email text := nullif(trim(p->>'email'), '');
  v_build_raw text := p->>'intended_build_id';
  v_build uuid := case
    when v_build_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then v_build_raw::uuid else null end;
begin
  if v_name is null or v_email is null then
    raise exception 'name and email are required' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('harbor_founder_spots'));
  select cap, enrollment_state into v_cap, v_state from public.founder_program where id;
  v_taken := public.founder_active_count();

  select id, founder_number, status into v_id, v_num, v_status
  from public.founder_signups
  where lower(email) = lower(v_email)
    and status in ('reserved','approved','scheduled','invoiced','active')
  limit 1;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'status', v_status, 'founder_number', v_num,
      'remaining', greatest(0, v_cap - v_taken), 'duplicate', true);
  end if;

  if v_state = 'paused' or v_taken >= v_cap then
    v_status := 'waitlist';
    v_num := null;
  else
    v_status := 'reserved';
    select min(n) into v_num from generate_series(1, v_cap) n
      where n not in (
        select founder_number from public.founder_signups
          where founder_number is not null
            and status in ('reserved','approved','scheduled','invoiced','active')
        union
        select founder_number from public.customers where founder_number is not null
      );
  end if;

  insert into public.founder_signups (name, email, phone, address, city, state, family_info,
      intended_build_id, wants_plus, logistics, heard_from, notes, founder_number, status, campaign, quote)
  values (v_name, v_email, nullif(trim(p->>'phone'),''), nullif(trim(p->>'address'),''),
      nullif(trim(p->>'city'),''), nullif(trim(p->>'state'),''),
      coalesce(p->'family_info','{}'::jsonb),
      v_build,
      coalesce((p->>'wants_plus')::boolean, false),
      coalesce(p->'logistics','{}'::jsonb),
      nullif(trim(p->>'heard_from'),''), nullif(trim(p->>'notes'),''),
      v_num, v_status, coalesce(p->'campaign','{}'::jsonb), coalesce(p->'quote','{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'status', v_status, 'founder_number', v_num,
    'remaining', greatest(0, v_cap - public.founder_active_count()), 'id', v_id);
end;
$$;
