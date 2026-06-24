-- Two-way Google Calendar sync (HARBOR_V2 §9.2.6). Per-household OAuth tokens live
-- in their own table — like ai_config, this is NEVER included in kiosk_snapshot, so
-- tokens never reach the wall. RLS scopes it to the household owner.
create table if not exists public.google_calendar (
  household_id uuid primary key references public.households(id) on delete cascade,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  calendar_id text not null default 'primary',
  sync_token text,
  connected_email text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar enable row level security;

create policy google_calendar_all on public.google_calendar for all
  using ((select public.is_admin()) or public.household_is_mine(household_id))
  with check ((select public.is_admin()) or public.household_is_mine(household_id));

create trigger set_updated_at_google_calendar
  before update on public.google_calendar
  for each row execute function public.set_updated_at();

-- Map a Harbor event to its Google counterpart so sync is idempotent both ways
-- (pull upserts by this id; push stamps it after creating in Google). Opaque id —
-- harmless to ride to_jsonb into the wall snapshot.
alter table public.events add column if not exists google_event_id text;
create index if not exists events_google_event_idx on public.events(google_event_id) where google_event_id is not null;
