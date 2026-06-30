-- Hide the underlying tablet brand/model from the public funnel: rpc_public_builds returns
-- only Harbor's own name + screen size + pricing. The model stays in the builds table for
-- operator procurement, but is never sent to the public client.
drop function if exists public.rpc_public_builds();
create function public.rpc_public_builds()
returns table (id uuid, name text, screen_size text,
               standard_price numeric, founder_price numeric, is_default boolean, sort_order int)
language sql stable security definer set search_path = '' as $$
  select id, name, screen_size, standard_price, founder_price, is_default, sort_order
  from public.builds order by sort_order;
$$;
grant execute on function public.rpc_public_builds() to anon, authenticated;
