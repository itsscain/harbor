-- Harbor — kiosk write-path hardening (review findings)
-- 1) Completions derive points SERVER-SIDE from the step (kiosk can't mint points).
-- 2) Completions + redemptions are idempotent via a client op id (safe retries).
-- 3) Tighten RLS WITH CHECK on child-bearing family tables to verify child ownership.

-- Idempotency key for reward_log writes pushed from the kiosk. Plain unique index
-- (Postgres treats NULLs as distinct, so legacy null op-ids never conflict).
alter table public.reward_log add column if not exists client_op_id uuid;
create unique index if not exists reward_log_client_op_id_uniq
  on public.reward_log (client_op_id);

create or replace function public.rpc_kiosk_push(p_secret uuid, p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_household uuid;
  v_item jsonb;
  v_child uuid;
  v_step uuid;
  v_opid uuid;
  v_points int;
  v_applied int := 0;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;

  -- Feelings check-ins (household-scoped to the device's children).
  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'check_ins', '[]'::jsonb))
  loop
    v_child := (v_item ->> 'child_id')::uuid;
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.check_ins (child_id, feeling, note, created_at)
      values (v_child, coalesce(v_item ->> 'feeling', 'unknown'), v_item ->> 'note',
              coalesce((v_item ->> 'created_at')::timestamptz, now()));
      v_applied := v_applied + 1;
    end if;
  end loop;

  -- Step completions: the award is the STEP's reward_points (never the payload),
  -- and is idempotent on client_op_id so a retried push can't double-mint.
  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'completions', '[]'::jsonb))
  loop
    v_child := (v_item ->> 'child_id')::uuid;
    v_step := nullif(v_item ->> 'step_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '')::uuid;

    select s.reward_points into v_points
    from public.routine_steps s
    join public.routines r on r.id = s.routine_id
    join public.children c on c.id = r.child_id
    where s.id = v_step and c.id = v_child and c.household_id = v_household
      and s.deleted_at is null;

    if found then
      insert into public.reward_log (child_id, delta, reason, step_id, client_op_id, created_at)
      values (v_child, v_points, 'step', v_step, v_opid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then  -- a row was actually inserted (not a retry conflict)
        insert into public.rewards (child_id, points_total) values (v_child, 0)
          on conflict (child_id) do nothing;
        update public.rewards set points_total = points_total + v_points where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  -- Redemptions only ever DECREMENT (floored at 0); idempotent on client_op_id.
  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'redemptions', '[]'::jsonb))
  loop
    v_child := (v_item ->> 'child_id')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '')::uuid;
    v_points := abs(coalesce((v_item ->> 'points')::int, 0));
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.reward_log (child_id, delta, reason, store_item_id, client_op_id, created_at)
      values (v_child, -v_points,
              coalesce(v_item ->> 'label', v_item ->> 'reason', 'reward'),
              nullif(v_item ->> 'store_item_id', '')::uuid, v_opid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0)
          on conflict (child_id) do nothing;
        update public.rewards set points_total = greatest(0, points_total - v_points) where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  -- Shared lists: the only non-reward wall write. Household-scoped + idempotent add.
  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'list_ops', '[]'::jsonb))
  loop
    if (v_item ->> 'op') = 'add' then
      insert into public.list_items (id, household_id, list_kind, name, category, quantity, added_by_label, created_at)
      values (
        coalesce(nullif(v_item ->> 'client_id', '')::uuid, gen_random_uuid()),
        v_household,
        coalesce(v_item ->> 'list_kind', 'grocery'),
        coalesce(v_item ->> 'name', 'Item'),
        v_item ->> 'category',
        v_item ->> 'quantity',
        v_item ->> 'added_by_label',
        coalesce((v_item ->> 'created_at')::timestamptz, now())
      )
      on conflict (id) do nothing;
      v_applied := v_applied + 1;
    elsif (v_item ->> 'op') = 'check' then
      update public.list_items
        set checked = coalesce((v_item ->> 'checked')::boolean, true), updated_at = now()
      where id = (v_item ->> 'id')::uuid and household_id = v_household;
      v_applied := v_applied + 1;
    end if;
  end loop;

  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return jsonb_build_object('ok', true, 'applied', v_applied, 'server_time', now());
end;
$$;

-- Defense-in-depth: a parent may only reference their OWN children on the
-- child-bearing family tables (RLS previously checked household_id only).
drop policy events_all on public.events;
create policy events_all on public.events for all
  using ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))))
  with check ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))));

drop policy store_items_all on public.store_items;
create policy store_items_all on public.store_items for all
  using ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))))
  with check ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))));

drop policy wall_messages_all on public.wall_messages;
create policy wall_messages_all on public.wall_messages for all
  using ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))))
  with check ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))));

drop policy reminders_all on public.reminders;
create policy reminders_all on public.reminders for all
  using ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))))
  with check ((select public.is_admin())
         or (public.household_is_mine(household_id) and (child_id is null or public.child_is_mine(child_id))));
