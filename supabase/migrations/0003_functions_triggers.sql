-- Harbor — functions & triggers

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'households','children','routines','routine_steps','rewards','calm_tools',
    'check_ins','builds','build_supplies','inventory','customers','referrals',
    'plus_subscriptions','device_pairings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- ── RLS helper functions (SECURITY DEFINER → bypass RLS, avoid recursion) ─────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.household_is_mine(hh uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.households h
    where h.id = hh and h.owner_id = auth.uid()
  );
$$;

create or replace function public.child_is_mine(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.children ch
    join public.households h on h.id = ch.household_id
    where ch.id = c and h.owner_id = auth.uid()
  );
$$;

create or replace function public.routine_is_mine(r uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.routines rt
    join public.children ch on ch.id = rt.child_id
    join public.households h on h.id = ch.household_id
    where rt.id = r and h.owner_id = auth.uid()
  );
$$;

-- ── New auth user → profile. First user ever becomes admin (bootstrap). ──────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  admin_exists boolean;
begin
  select exists (select 1 from public.profiles where role = 'admin') into admin_exists;
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when admin_exists then 'parent'::public.user_role else 'admin'::public.user_role end,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
