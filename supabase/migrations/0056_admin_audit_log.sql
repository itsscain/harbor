-- Operator audit log (§13): an append-only record of admin actions in the console. actor =
-- the admin's profile id; actor_name snapshotted so the row survives a profile rename/delete.
-- No update/delete policy = effectively append-only under RLS.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id),
  actor_name text,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);

alter table public.admin_audit_log enable row level security;
create policy admin_audit_log_select on public.admin_audit_log for select using (public.is_admin());
create policy admin_audit_log_insert on public.admin_audit_log for insert with check (public.is_admin());
