-- Make the founder cap configurable (Operator Settings §9.4): the hardcoded 1..15 bound on
-- customers.founder_number blocked raising founder_program.cap. Relax to "positive"; the cap is
-- enforced at reservation (rpc_reserve_founder_spot reads founder_program.cap) and uniqueness by
-- the partial index, so the rigid upper bound is no longer needed.
alter table public.customers drop constraint if exists customers_founder_number_range;
alter table public.customers
  add constraint customers_founder_number_positive
  check (founder_number is null or founder_number >= 1);
