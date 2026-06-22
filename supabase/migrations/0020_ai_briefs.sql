-- Cached daily AI brief for the wall's screensaver. Generated at most once per
-- household per day (cost control); the kiosk fetches it from a device-validated
-- server route that uses the household's key server-side (key never hits the wall).
create table if not exists public.ai_briefs (
  household_id uuid not null references public.households(id) on delete cascade,
  date date not null,
  brief text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, date)
);

alter table public.ai_briefs enable row level security;
drop policy if exists ai_briefs_owner on public.ai_briefs;
create policy ai_briefs_owner on public.ai_briefs for select
  using (public.household_is_mine(household_id));
-- Writes happen only from the server route via the service role (bypasses RLS).
