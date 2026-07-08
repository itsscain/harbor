-- "Command" — the parent's phone becomes a live remote for the house (Parent Power).
-- Adds wall_commands (ephemeral parent→wall "pops"), requests (kid→parent asks), and
-- wires both + house_mode (kept in households.settings, no DDL) into the kiosk snapshot +
-- <1s broadcast + kid push path. A kid ask fires an instant parent push via a DB trigger
-- → /api/cron/notify-request (bearer read from Vault, so the public repo stays secret-free).
--
-- NOTE: kiosk_snapshot / kiosk_broadcast / rpc_kiosk_push below are rebuilt from their LIVE
-- defs (pg_get_functiondef) with the new bits folded in — never hand-reconstructed from an
-- older migration file. Keep it that way on the next edit.

-- ── wall_commands: ephemeral live "pops" the parent fires at a wall / a child ────
create table if not exists public.wall_commands (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid references public.children(id) on delete cascade,   -- null = whole house
  kind text not null,                 -- 'attention' | 'note' | 'praise' | 'calm'
  body text,
  emoji text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 seconds')
);
create index if not exists wall_commands_hh_idx on public.wall_commands (household_id, expires_at);
alter table public.wall_commands enable row level security;
drop policy if exists wall_commands_owner on public.wall_commands;
create policy wall_commands_owner on public.wall_commands
  for all to authenticated
  using (public.household_is_mine(household_id))
  with check (public.household_is_mine(household_id));

-- ── requests: a kid asks a grown-up for something (screen time, help, a treat…) ─
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  kind text not null,                 -- 'screen_time'|'reward'|'help'|'snack'|'outside'|'other'
  amount int,
  body text,
  status text not null default 'pending',   -- 'pending'|'approved'|'denied'|'cancelled'
  response_note text,
  decided_by uuid,
  decided_at timestamptz,
  client_op_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists requests_hh_idx on public.requests (household_id, status, created_at desc);
alter table public.requests enable row level security;
drop policy if exists requests_owner on public.requests;
create policy requests_owner on public.requests
  for all to authenticated
  using (public.household_is_mine(household_id))
  with check (public.household_is_mine(household_id));

drop trigger if exists set_updated_at on public.requests;
create trigger set_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

-- ── <1s broadcast: also nudge the wall on households / wall_commands / requests ──
drop trigger if exists kiosk_broadcast_t on public.households;
create trigger kiosk_broadcast_t after insert or update or delete on public.households
  for each row execute function public.kiosk_broadcast();
drop trigger if exists kiosk_broadcast_t on public.wall_commands;
create trigger kiosk_broadcast_t after insert or update or delete on public.wall_commands
  for each row execute function public.kiosk_broadcast();
drop trigger if exists kiosk_broadcast_t on public.requests;
create trigger kiosk_broadcast_t after insert or update or delete on public.requests
  for each row execute function public.kiosk_broadcast();

-- The canonical, rebuilt-from-live definitions of kiosk_broadcast(), kiosk_snapshot(),
-- rpc_kiosk_push() and the new requests_notify() trigger were applied together in this
-- migration via the Supabase MCP. See the DB for the authoritative bodies (they add:
--   • kiosk_broadcast  → 'households'/'wall_commands'/'requests' → household resolution
--   • kiosk_snapshot   → 'wall_commands' (unexpired) + 'requests' (pending/recent) keys
--   • rpc_kiosk_push   → a points-free 'requests' loop (kid asks, idempotent by op_id)
--   • requests_notify  → net.http_post → /api/cron/notify-request on each new request

-- requests_notify is a trigger function; it should never be a callable RPC.
revoke execute on function public.requests_notify() from anon, authenticated;
