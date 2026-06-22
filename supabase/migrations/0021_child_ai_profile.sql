-- Per-child AI profile: a small JSON the companion builds from the child's data
-- (summary, interests, motivators, encouragement lines, optional parent note).
-- children rides to_jsonb(c) in kiosk_snapshot, so this flows to the wall, where
-- the kid's screen shows personalized encouragement OFFLINE (no per-tap AI cost).
-- Not a secret (no API key here) — safe on the device.
alter table public.children add column if not exists ai_profile jsonb;
