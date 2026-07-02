-- The Harbor Lantern (/lantern) — device-initiated pairing (HARBOR_LANTERN_DEVICE.md §3).
-- The Lantern (a per-child bedside device = the Outpost, commercialized) SHOWS a code; the
-- parent enters it in the app and picks the child. This inverts the existing parent-initiated
-- flow (parent makes the code, device enters it), so a `pairing_requests` staging table holds
-- the pre-auth request until a parent claims + binds it. Once claimed it becomes a normal
-- `outpost` device_pairings row and uses the existing kiosk sync (rpc_kiosk_pull/push).
--
-- Security model (§7): the device holds a secret `device_nonce` (only it can poll its own
-- result → the device-secret is never returned to someone who merely knows the code); the
-- claim is authenticated + gated by child_is_mine (binds only to the caller's own child);
-- codes expire in 15 minutes. The table is RLS deny-all — only the SECURITY DEFINER RPCs
-- below touch it.

-- ── pairing_requests (pre-auth staging) ──────────────────────────────────────
create table if not exists public.pairing_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  device_nonce uuid not null default gen_random_uuid(),
  status text not null default 'waiting' check (status in ('waiting','claimed','expired')),
  device_secret uuid,                                             -- issued at claim (kiosk credential)
  household_id uuid references public.households(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  nickname text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  claimed_at timestamptz
);
-- Active codes are unique; expired/claimed ones may recycle a code.
create unique index if not exists pairing_requests_code_waiting_idx
  on public.pairing_requests (code) where status = 'waiting';
create index if not exists pairing_requests_nonce_idx on public.pairing_requests (device_nonce);
alter table public.pairing_requests enable row level security;
-- Revoked grants + an explicit deny-all policy: the table is reachable ONLY through the
-- SECURITY DEFINER RPCs below (which run as owner and bypass RLS). No client ever reads it.
revoke all on public.pairing_requests from anon, authenticated;
drop policy if exists pairing_requests_no_direct_access on public.pairing_requests;
create policy pairing_requests_no_direct_access on public.pairing_requests
  for all using (false) with check (false);

-- ── helper: a fresh unambiguous 6-char code (no O/0/I/1), unique among live requests ──
create or replace function public.gen_lantern_code()
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
  i int;
  tries int := 0;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alpha, 1 + floor(random() * length(alpha))::int, 1);
    end loop;
    exit when not exists (select 1 from public.pairing_requests where code = c and status = 'waiting');
    tries := tries + 1;
    if tries > 50 then raise exception 'code_generation_failed' using errcode = 'P0001'; end if;
  end loop;
  return c;
end $$;
revoke execute on function public.gen_lantern_code() from public, anon, authenticated;

-- ── rpc_lantern_request_code (anon) — the device asks for a code to show ──────
create or replace function public.rpc_lantern_request_code()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare v_code text; v_nonce uuid;
begin
  -- Housekeeping: retire stale requests so codes free up.
  update public.pairing_requests set status = 'expired'
    where status = 'waiting' and expires_at < now();
  v_code := public.gen_lantern_code();
  insert into public.pairing_requests (code) values (v_code)
    returning device_nonce into v_nonce;
  return jsonb_build_object('code', v_code, 'nonce', v_nonce);
end $$;
revoke execute on function public.rpc_lantern_request_code() from public;
grant execute on function public.rpc_lantern_request_code() to anon, authenticated;

-- ── rpc_lantern_poll (anon, nonce-gated) — the device waits to be claimed ─────
create or replace function public.rpc_lantern_poll(p_nonce uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare r public.pairing_requests;
begin
  select * into r from public.pairing_requests where device_nonce = p_nonce limit 1;
  if not found then return jsonb_build_object('status', 'expired'); end if;
  if r.status = 'waiting' and r.expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  if r.status <> 'claimed' then
    return jsonb_build_object('status', r.status);
  end if;
  -- Claimed: hand the device its secret + the household snapshot (only the nonce-holder
  -- reaches this — knowing the code is not enough).
  return jsonb_build_object(
    'status', 'claimed',
    'device_secret', r.device_secret,
    'household_id', r.household_id,
    'kind', 'outpost',
    'child_id', r.child_id,
    'snapshot', public.kiosk_snapshot(r.household_id, null)
  );
end $$;
revoke execute on function public.rpc_lantern_poll(uuid) from public;
grant execute on function public.rpc_lantern_poll(uuid) to anon, authenticated;

-- ── rpc_lantern_claim (authenticated) — parent binds the code to their child ──
create or replace function public.rpc_lantern_claim(p_code text, p_child_id uuid, p_nickname text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  r public.pairing_requests;
  v_household uuid;
  v_secret uuid := gen_random_uuid();
  v_dcode text;
  v_tries int := 0;
  v_nick text := nullif(btrim(coalesce(p_nickname, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  -- Authorize + bind only to the caller's OWN child (child_is_mine reads auth.uid()).
  if not public.child_is_mine(p_child_id) then
    raise exception 'not_your_child' using errcode = 'P0001';
  end if;
  select household_id into v_household from public.children where id = p_child_id;
  -- A live, waiting request for this code.
  select * into r from public.pairing_requests
    where code = upper(btrim(p_code)) and status = 'waiting' and expires_at >= now()
    limit 1;
  if not found then
    raise exception 'invalid_or_expired_code' using errcode = 'P0001';
  end if;
  -- A unique internal code for the device_pairings row (its own unique column).
  loop
    v_dcode := public.gen_lantern_code();
    exit when not exists (select 1 from public.device_pairings where code = v_dcode);
    v_tries := v_tries + 1;
    if v_tries > 50 then raise exception 'code_generation_failed' using errcode = 'P0001'; end if;
  end loop;
  -- Create the real outpost device (uses the existing kiosk sync from here on).
  insert into public.device_pairings
    (household_id, code, device_secret, kind, child_id, device_label, status, paired_at, last_synced_at, paired_by)
  values
    (v_household, v_dcode, v_secret, 'outpost', p_child_id, v_nick, 'paired', now(), now(), auth.uid());
  -- Fill the request so the device's next poll adopts the secret + snapshot.
  update public.pairing_requests
    set status = 'claimed', device_secret = v_secret, household_id = v_household,
        child_id = p_child_id, nickname = v_nick, claimed_at = now()
    where id = r.id;
  return jsonb_build_object('ok', true,
    'child_name', (select name from public.children where id = p_child_id));
end $$;
revoke execute on function public.rpc_lantern_claim(text, uuid, text) from public, anon;
grant execute on function public.rpc_lantern_claim(text, uuid, text) to authenticated;
