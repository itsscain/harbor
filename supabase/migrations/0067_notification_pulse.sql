-- Notifications v2 — the frequent "pulse" engine. Supabase pg_cron hits the Vercel
-- /api/cron/pulse route every 15 min (sub-hourly is impossible on Vercel Hobby cron),
-- which fires event reminders / due reminders / medication-due pushes. A dispatch log
-- dedups so each fires exactly once.
--
-- SECRET NOTE: the bearer for /api/cron/pulse is stored in Supabase Vault as
-- `harbor_pulse_secret` (matching the Vercel env var PULSE_SECRET) and read at cron time —
-- so no secret lives in this file (the repo is public) or in cron.job plaintext. Seed it
-- once, out of band:  select vault.create_secret('<PULSE_SECRET>', 'harbor_pulse_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- One-time dispatch dedup (service-role only; the pulse route claims a slot before sending).
create table if not exists public.notification_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null,           -- 'event' | 'reminder' | 'med'
  entity_id uuid not null,      -- the event / reminder / medication id
  dose_key text not null,       -- disambiguator: date, or date:time for a med dose
  created_at timestamptz not null default now(),
  unique (household_id, kind, entity_id, dose_key)
);
create index if not exists ndl_created_idx on public.notification_dispatch_log (created_at);
alter table public.notification_dispatch_log enable row level security;
-- No policies → denied to anon/authenticated; only the service role (pulse route) touches it.

-- Schedule the pulse (idempotent); reads the bearer from Vault.
do $$ begin
  perform cron.unschedule('harbor-pulse');
exception when others then null; end $$;

select cron.schedule(
  'harbor-pulse',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := 'https://harbor-liard.vercel.app/api/cron/pulse',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'harbor_pulse_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
