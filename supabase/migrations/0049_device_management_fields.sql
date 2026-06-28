-- Device Management §10 — extend device_pairings with identity + status fields (all
-- additive / nullable-or-defaulted, so existing paired walls are untouched). device_label
-- (nickname), kind (type: wall|outpost), child_id (outpost binding), paired_at, and
-- last_synced_at (last-seen) already exist. room_id waits for the rooms table (D4).
alter table public.device_pairings
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists app_version text,
  add column if not exists paired_by uuid,
  add column if not exists paused boolean not null default false,
  add column if not exists settings_json jsonb not null default '{}'::jsonb,
  add column if not exists clock_suspect boolean not null default false,
  add column if not exists status_note text;
