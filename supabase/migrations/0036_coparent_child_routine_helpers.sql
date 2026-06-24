-- Co-parent fix (review wtfm4xipx, CRITICAL): child_is_mine + routine_is_mine
-- checked owner_id directly, so co-parent MEMBERS were denied routines/steps/
-- rewards/check-ins (every child-scoped table). Route them through the widened
-- household_is_mine (owner OR member) so membership flows everywhere. Owners are
-- unaffected (household_is_mine still returns true for them).
-- NOTE: these MUST stay SECURITY DEFINER + search_path='' — they call
-- household_is_mine, which bypasses RLS on household_members to avoid recursion.
create or replace function public.child_is_mine(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.children ch
    where ch.id = c and public.household_is_mine(ch.household_id)
  );
$$;

create or replace function public.routine_is_mine(r uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.routines rt
    join public.children ch on ch.id = rt.child_id
    where rt.id = r and public.household_is_mine(ch.household_id)
  );
$$;
