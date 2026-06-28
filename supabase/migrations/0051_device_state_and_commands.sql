-- Device Management D3 — the device learns its own state (identity + settings + a queued
-- remote command) and reports its build, so the parent can see "on an old version" and
-- fix it remotely. A one-shot command queue: the parent sets pending_command; the device
-- pops + clears it on its next check-in (so a command is delivered exactly once).
alter table public.device_pairings add column if not exists pending_command text;

-- The device (anon, authed by its device-secret) checks in: reports its app build, gets
-- its identity/settings, and pops any pending command. Mirrors rpc_kiosk_pull's auth.
create or replace function public.rpc_kiosk_device_state(p_secret uuid, p_app_version text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.device_pairings;
  v_cmd text;
begin
  select * into v_row from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;

  v_cmd := v_row.pending_command;
  update public.device_pairings
    set last_synced_at = now(),
        app_version = coalesce(p_app_version, app_version),
        pending_command = null
  where id = v_row.id;

  return jsonb_build_object(
    'id', v_row.id,
    'device_label', v_row.device_label,
    'kind', v_row.kind,
    'child_id', v_row.child_id,
    'settings', v_row.settings_json,
    'paused', v_row.paused,
    'command', v_cmd
  );
end;
$function$;

grant execute on function public.rpc_kiosk_device_state(uuid, text) to anon, authenticated;
