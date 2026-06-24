-- Co-parent / multi-guardian mode (HARBOR_V2 §9.2.11). A household can have several
-- guardians. Backward-compatible: the owner stays the owner; household_is_mine now
-- also returns true for members, so NO existing access changes.
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'guardian',
  created_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);

-- Seed every existing owner as a member (so the membership check covers them too).
insert into public.household_members (household_id, profile_id, role)
select id, owner_id, 'owner' from public.households
on conflict (household_id, profile_id) do nothing;

alter table public.household_members enable row level security;

-- Members can see co-members of their household; only the OWNER (or admin) manages.
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members for select
  using (profile_id = auth.uid() or (select public.is_admin()) or public.household_is_mine(household_id));
drop policy if exists household_members_write on public.household_members;
create policy household_members_write on public.household_members for all
  using ((select public.is_admin()) or exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid()))
  with check ((select public.is_admin()) or exists (select 1 from public.households h where h.id = household_id and h.owner_id = auth.uid()));

-- Widen household_is_mine: owner OR member. SECURITY DEFINER bypasses RLS on the
-- member lookup (no recursion). Owners still pass via owner_id (belt-and-suspenders).
CREATE OR REPLACE FUNCTION public.household_is_mine(hh uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.households h where h.id = hh and h.owner_id = auth.uid()
  ) or exists (
    select 1 from public.household_members m where m.household_id = hh and m.profile_id = auth.uid()
  );
$function$;
