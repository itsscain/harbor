-- Per-chore "needs a grown-up's OK": completing it on the wall requires the
-- parent PIN, so kids can't claim credit for tasks they didn't actually do.
-- Rides to_jsonb(ch) into the snapshot; default false (trust-based, instant).
alter table public.chores add column if not exists requires_approval boolean not null default false;
