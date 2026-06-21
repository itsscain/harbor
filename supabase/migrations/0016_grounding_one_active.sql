-- Structural invariant: a child can have at most one active grounding at a time.
-- startGrounding does close-then-insert; this partial unique index makes a
-- concurrent double-fire (two tabs / a retried request) physically unable to
-- create a second active row, instead of relying on a racy read-then-write.

create unique index if not exists groundings_one_active_per_child
  on public.groundings (child_id)
  where status = 'active' and deleted_at is null;
