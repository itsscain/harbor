-- Weekly chore rotation: an ordered list of child ids the chore rotates through.
-- The wall picks the current week's assignee offline. null/empty = fixed (child_id).
-- Rides to_jsonb(ch) in kiosk_snapshot automatically — no function rebuild needed.
alter table public.chores add column if not exists rotation_member_ids jsonb;
