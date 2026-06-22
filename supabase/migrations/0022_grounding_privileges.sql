-- Grounding v2: custom "privileges lost" bubbles (e.g. ["No TV","No tablet time"]).
-- Rides to_jsonb(g) in kiosk_snapshot automatically; inherits the groundings RLS.
alter table public.groundings add column if not exists privileges_lost jsonb;
