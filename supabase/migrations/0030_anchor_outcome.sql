-- Anchor (HARBOR_V2 §9.1.1) — capture how a session went, to feed Tides pattern
-- intelligence later (Phase E). Additive columns on the existing corners table;
-- they ride to_jsonb(co) in kiosk_snapshot automatically, so no snapshot rebuild.
alter table public.corners add column if not exists outcome text;
alter table public.corners add column if not exists regulation_seconds int;
