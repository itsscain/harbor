-- AI companion config: the household's own Anthropic API key + enable flag.
-- SECURITY: this table is NEVER returned by kiosk_snapshot and is NOT touched by
-- the anon kiosk RPCs, so the key never reaches the wall device. Only the
-- household's parent (household_is_mine) can read/write it, and the settings UI
-- only ever reads a "key is set" boolean — never the raw key — back to the client.
create table if not exists public.ai_config (
  household_id uuid primary key references public.households(id) on delete cascade,
  anthropic_api_key text,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.ai_config enable row level security;
drop policy if exists ai_config_all on public.ai_config;
create policy ai_config_all on public.ai_config for all
  using (public.household_is_mine(household_id))
  with check (public.household_is_mine(household_id));
