-- Tides (HARBOR_V2 §9.1.2) — longitudinal pattern intelligence. Cached per-child
-- insights generated from corner/Anchor + check-in history (BYO-key AI, server-side).
-- The analysis runs on existing data; this table just caches the latest insight.
create table if not exists public.tides_insights (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  period_start date,
  period_end date,
  summary text,
  pattern jsonb,
  suggestion text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists tides_insights_child_idx on public.tides_insights(child_id, created_at desc);

alter table public.tides_insights enable row level security;

create policy tides_insights_all on public.tides_insights for all
  using ((select public.is_admin()) or public.child_is_mine(child_id))
  with check ((select public.is_admin()) or public.child_is_mine(child_id));
