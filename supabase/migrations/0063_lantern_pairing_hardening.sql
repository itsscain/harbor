-- Lantern pairing — review hardening (0062 follow-up).
-- 1) The device_secret must NOT be served forever: a claimed request is now valid for a
--    short adopt window (5 min), poll enforces expiry for EVERY status (not just 'waiting')
--    and DELETEs the row the moment it's expired — so the credential is scrubbed from the
--    pre-auth staging table promptly and can't be re-adopted onto a second device later.
-- 2) Bound table growth from the anon request RPC: housekeeping now DELETEs every expired
--    row (waiting AND claimed-past-window), not just flips status — so flooding self-cleans.

-- ── poll: universal expiry + burn (was: expiry only for 'waiting', claimed served forever)
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
  -- Expired (waiting past 15m, or claimed past its 5m adopt window) → scrub + done.
  if r.expires_at < now() then
    delete from public.pairing_requests where id = r.id;
    return jsonb_build_object('status', 'expired');
  end if;
  if r.status <> 'claimed' then
    return jsonb_build_object('status', r.status);
  end if;
  -- Claimed + inside the window: hand the device its secret + the household snapshot (only
  -- the nonce-holder reaches this). The 5m window tolerates poll/adopt retries, then expires.
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

-- ── request_code: DELETE expired rows (bounds growth + scrubs any lingering secret) ──
create or replace function public.rpc_lantern_request_code()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare v_code text; v_nonce uuid;
begin
  delete from public.pairing_requests where expires_at < now();
  v_code := public.gen_lantern_code();
  insert into public.pairing_requests (code) values (v_code)
    returning device_nonce into v_nonce;
  return jsonb_build_object('code', v_code, 'nonce', v_nonce);
end $$;
revoke execute on function public.rpc_lantern_request_code() from public;
grant execute on function public.rpc_lantern_request_code() to anon, authenticated;

-- ── claim: give the device a short (5 min) window to adopt, then the row expires ──
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
  v_dcode text; v_tries int := 0;
  v_nick text := nullif(btrim(coalesce(p_nickname, '')), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if not public.child_is_mine(p_child_id) then raise exception 'not_your_child' using errcode = 'P0001'; end if;
  select household_id into v_household from public.children where id = p_child_id;
  select * into r from public.pairing_requests
    where code = upper(btrim(p_code)) and status = 'waiting' and expires_at >= now() limit 1;
  if not found then raise exception 'invalid_or_expired_code' using errcode = 'P0001'; end if;
  loop
    v_dcode := public.gen_lantern_code();
    exit when not exists (select 1 from public.device_pairings where code = v_dcode);
    v_tries := v_tries + 1;
    if v_tries > 50 then raise exception 'code_generation_failed' using errcode = 'P0001'; end if;
  end loop;
  insert into public.device_pairings
    (household_id, code, device_secret, kind, child_id, device_label, status, paired_at, last_synced_at, paired_by)
  values
    (v_household, v_dcode, v_secret, 'outpost', p_child_id, v_nick, 'paired', now(), now(), auth.uid());
  update public.pairing_requests
    set status = 'claimed', device_secret = v_secret, household_id = v_household,
        child_id = p_child_id, nickname = v_nick, claimed_at = now(),
        expires_at = now() + interval '5 minutes'   -- short adopt window for the device
    where id = r.id;
  return jsonb_build_object('ok', true, 'child_name', (select name from public.children where id = p_child_id));
end $$;
revoke execute on function public.rpc_lantern_claim(text, uuid, text) from public, anon;
grant execute on function public.rpc_lantern_claim(text, uuid, text) to authenticated;
