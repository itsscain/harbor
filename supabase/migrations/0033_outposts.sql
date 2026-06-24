-- Outposts (HARBOR_V2 §9.1.4): a device can pair as a 'wall' (full hub) or an
-- 'outpost' bound to a single child (a per-child room device).
alter table public.device_pairings add column if not exists kind text not null default 'wall';
alter table public.device_pairings add column if not exists child_id uuid references public.children(id) on delete set null;
alter table public.device_pairings drop constraint if exists device_pairings_kind_check;
alter table public.device_pairings add constraint device_pairings_kind_check check (kind in ('wall', 'outpost'));

-- Pair returns the device's kind + bound child so the kiosk can render the right mode.
CREATE OR REPLACE FUNCTION public.rpc_kiosk_pair(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_pairing public.device_pairings;
  v_secret uuid;
begin
  select * into v_pairing from public.device_pairings
  where code = upper(trim(p_code)) and status = 'pending'
  limit 1;

  if not found then
    raise exception 'invalid_or_used_code' using errcode = 'P0001';
  end if;

  v_secret := gen_random_uuid();
  update public.device_pairings
    set device_secret = v_secret, status = 'paired',
        paired_at = now(), last_synced_at = now()
  where id = v_pairing.id;

  return jsonb_build_object(
    'device_secret', v_secret,
    'household_id', v_pairing.household_id,
    'kind', v_pairing.kind,
    'child_id', v_pairing.child_id,
    'snapshot', public.kiosk_snapshot(v_pairing.household_id, null)
  );
end;
$function$;
