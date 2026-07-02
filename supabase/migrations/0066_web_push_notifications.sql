-- Parent push notifications (HARBOR_PUSH_NOTIFICATIONS.md). /app-only: the recipient set is parent
-- push subscriptions + a parent-owned in-app record. Kiosk/Lantern (device-secret) are never targeted.

-- Web-push subscriptions, one per parent per browser/device. Multiple per parent.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  device_label text,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  platform text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  active boolean not null default true,
  unique (parent_id, endpoint)
);
create index if not exists push_subscriptions_household_idx on public.push_subscriptions (household_id) where active;
create index if not exists push_subscriptions_parent_idx on public.push_subscriptions (parent_id) where active;

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions
  for all using ((select auth.uid()) = parent_id or (select public.is_admin()))
  with check ((select auth.uid()) = parent_id or (select public.is_admin()));

-- The in-app notification center record — the durable source of truth (push is best-effort).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  tier smallint not null default 3,
  category text not null,
  title text not null,
  body text not null,
  route text,
  detail_level text not null default 'full',
  status text not null default 'unread',
  created_at timestamptz not null default now()
);
create index if not exists notifications_parent_created_idx on public.notifications (parent_id, created_at desc);
create index if not exists notifications_parent_unread_idx on public.notifications (parent_id) where status = 'unread';

alter table public.notifications enable row level security;
-- Parents read + update (mark read) their own; the server writes via the service role (admin).
create policy notifications_own on public.notifications
  for all using ((select auth.uid()) = parent_id or (select public.is_admin()))
  with check ((select auth.uid()) = parent_id or (select public.is_admin()));

-- Per-parent notification preferences (categories, channels, quiet hours, lock-screen detail level).
create table if not exists public.notification_preferences (
  parent_id uuid primary key references public.profiles(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy notification_preferences_own on public.notification_preferences
  for all using ((select auth.uid()) = parent_id or (select public.is_admin()))
  with check ((select auth.uid()) = parent_id or (select public.is_admin()));

comment on table public.push_subscriptions is 'Web-push subscriptions per parent per device (/app only). Sent to via the service role; kiosk/Lantern are never in this set.';
comment on table public.notifications is 'In-app notification center — the durable record (push is best-effort). Written by the server (service role); read/updated by the owning parent under RLS.';
comment on table public.notification_preferences is 'Per-parent notification preferences (categories on/off, channels, quiet hours, lock-screen detail level).';
