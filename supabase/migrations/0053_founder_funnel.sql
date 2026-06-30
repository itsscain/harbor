-- The Founder Funnel (Operator HQ §17): a public "claim your founder spot" flow.
-- A configurable founder program (cap/rate/enrollment), a founder_signups quote/lead
-- table, and anon RPCs: an atomic race-safe reservation, a count-only "spots remaining",
-- and a public builds list for the funnel quote. The public never sees the list — only the
-- number — and the cap can never be oversold (advisory-lock-serialized allocation).

create table if not exists public.founder_program (
  id boolean primary key default true,
  cap int not null default 15,
  rate numeric(10,2) not null default 249,
  enrollment_state text not null default 'open', -- open | paused
  updated_at timestamptz not null default now(),
  constraint founder_program_singleton check (id)
);
insert into public.founder_program (id) values (true) on conflict (id) do nothing;

do $$ begin
  create type public.founder_signup_status as enum
    ('reserved','approved','scheduled','invoiced','active','released','waitlist');
exception when duplicate_object then null; end $$;

create table if not exists public.founder_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  address text,
  city text,
  state text,
  family_info jsonb not null default '{}'::jsonb,
  intended_build_id uuid references public.builds(id) on delete set null,
  wants_plus boolean not null default false,
  logistics jsonb not null default '{}'::jsonb,
  heard_from text,
  notes text,
  founder_number int,
  status public.founder_signup_status not null default 'reserved',
  email_verified boolean not null default false,
  campaign jsonb not null default '{}'::jsonb,
  quote jsonb not null default '{}'::jsonb,
  household_id uuid references public.households(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists founder_signups_status_idx on public.founder_signups(status);
create index if not exists founder_signups_created_idx on public.founder_signups(created_at desc);

alter table public.founder_program enable row level security;
alter table public.founder_signups enable row level security;

create policy founder_program_admin on public.founder_program
  for all using (public.is_admin()) with check (public.is_admin());
create policy founder_signups_admin on public.founder_signups
  for all using (public.is_admin()) with check (public.is_admin());

-- Spots taken = active funnel reservations + any existing customer founder numbers.
create or replace function public.founder_active_count()
returns int language sql stable security definer set search_path = '' as $$
  select (
    (select count(*) from public.founder_signups
       where status in ('reserved','approved','scheduled','invoiced','active'))
    + (select count(*) from public.customers where founder_number is not null)
  )::int;
$$;
-- Internal helper — the public RPCs call it as SECURITY DEFINER; the anon caller must not.
revoke execute on function public.founder_active_count() from anon, authenticated, public;

create or replace function public.rpc_founder_spots_remaining()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'remaining', greatest(0, (select cap from public.founder_program where id) - public.founder_active_count()),
    'cap', (select cap from public.founder_program where id),
    'state', (select enrollment_state from public.founder_program where id)
  );
$$;
grant execute on function public.rpc_founder_spots_remaining() to anon, authenticated;

create or replace function public.rpc_public_builds()
returns table (id uuid, name text, screen_size text, tablet_model text,
               standard_price numeric, founder_price numeric, is_default boolean, sort_order int)
language sql stable security definer set search_path = '' as $$
  select id, name, screen_size, tablet_model, standard_price, founder_price, is_default, sort_order
  from public.builds order by sort_order;
$$;
grant execute on function public.rpc_public_builds() to anon, authenticated;

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
      nullif(p->>'intended_build_id','')::uuid,
      coalesce((p->>'wants_plus')::boolean, false),
      coalesce(p->'logistics','{}'::jsonb),
      nullif(trim(p->>'heard_from'),''), nullif(trim(p->>'notes'),''),
      v_num, v_status, coalesce(p->'campaign','{}'::jsonb), coalesce(p->'quote','{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'status', v_status, 'founder_number', v_num,
    'remaining', greatest(0, v_cap - public.founder_active_count()), 'id', v_id);
end;
$$;
grant execute on function public.rpc_reserve_founder_spot(jsonb) to anon, authenticated;
