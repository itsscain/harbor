-- Harbor — per-child birthday. The kiosk derives a recurring "N sleeps until
-- {name}'s birthday" countdown from this (next occurrence of the month/day).
-- children rides to_jsonb(c) in kiosk_snapshot, so the column flows to the wall
-- automatically — no snapshot change needed.

alter table public.children add column if not exists birthday date;
