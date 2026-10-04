-- Harbor Learn: finished tutorials sync like other progress.
--   rpc_learn_sync accepts collect events "tutorial:<id>" (e.g. tutorial:boat — Boat School, the
--   unskippable lesson on how the boat follows every block), so a child who finished it on the
--   wall doesn't get it again after the next sync. Otherwise unchanged from 0076.

create or replace function public.rpc_learn_sync(p_secret uuid, p_results jsonb default '[]'::jsonb, p_events jsonb default '[]'::jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_household uuid;
  v_tz text;
  v_item jsonb;
  v_child uuid;
  v_lesson text;
  v_op text;
  v_stars int;
  v_completed timestamptz;
  v_inserted uuid;
  v_earn boolean;
  v_today int;
  v_award int;
  v_skills jsonb;
  v_type text;
  v_amount int;
  v_look jsonb;
  v_thing text;
  v_reason text;
  v_data jsonb;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;
  select coalesce(nullif(settings ->> 'timezone', ''), 'America/New_York') into v_tz from public.households where id = v_household;

  -- Finished lessons.
  for v_item in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) limit 200 loop
    begin
      v_child := nullif(v_item ->> 'child_id', '')::uuid;
      v_lesson := left(nullif(v_item ->> 'lesson_id', ''), 80);
      v_op := left(nullif(v_item ->> 'op_id', ''), 120);
      continue when v_child is null or v_lesson is null or v_op is null;
      continue when not exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household and c.deleted_at is null);
      v_stars := greatest(0, least(3, coalesce((v_item ->> 'stars')::int, 0)));
      v_completed := least(coalesce((v_item ->> 'completed_at')::timestamptz, now()), now() + interval '2 minutes');
      v_skills := (
        select jsonb_object_agg(left(e.key, 80), jsonb_build_array(
                 greatest(0, least(500, ((e.value ->> 0)::numeric)::int)),
                 greatest(0, least(500, ((e.value ->> 1)::numeric)::int))))
        from (select key, value from jsonb_each(case when jsonb_typeof(v_item -> 'skills') = 'object' then v_item -> 'skills' else '{}'::jsonb end) limit 80) e
        where jsonb_typeof(e.value) = 'array' and jsonb_typeof(e.value -> 0) = 'number' and jsonb_typeof(e.value -> 1) = 'number');
      v_inserted := null;

      insert into public.learn_results (household_id, child_id, lesson_id, subject, stars, correct, total, duration_sec, sticker, completed_at, client_op_id, skills, kind, shells)
      values (
        v_household, v_child, v_lesson,
        case when v_item ->> 'subject' in ('reading', 'code', 'math', 'manners', 'faith', 'science') then v_item ->> 'subject' else 'reading' end,
        v_stars,
        greatest(0, least(500, coalesce((v_item ->> 'correct')::int, 0))),
        greatest(0, least(500, coalesce((v_item ->> 'total')::int, 0))),
        greatest(0, least(7200, coalesce((v_item ->> 'duration_sec')::int, 0))),
        left(nullif(v_item ->> 'sticker', ''), 40),
        v_completed, v_op,
        v_skills,
        case when v_item ->> 'kind' in ('lesson', 'review', 'boss', 'practice') then v_item ->> 'kind' else null end,
        greatest(0, least(500, coalesce((v_item ->> 'shells')::int, 0)))
      )
      on conflict (client_op_id) do nothing
      returning id into v_inserted;

      if v_inserted is not null and v_stars >= 1 then
        update public.learn_assignments set status = 'done', completed_at = v_completed
        where child_id = v_child and status = 'assigned' and deleted_at is null
          and (lesson_id = v_lesson or (lesson_id like 'practice:%' and v_lesson like lesson_id || ':%'));

        select coalesce((select earn_stars from public.learn_profiles where child_id = v_child), true) into v_earn;
        if v_earn then
          select coalesce(sum(delta), 0) into v_today from public.reward_log
          where child_id = v_child and reason = 'learn' and deleted_at is null
            and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date;
          v_award := least(case when v_stars >= 3 then 2 else 1 end, greatest(0, 10 - v_today));
          if v_award > 0 then
            insert into public.reward_log (child_id, delta, reason, client_op_id, created_at)
            values (v_child, v_award, 'learn', 'learn:' || v_op, v_completed)
            on conflict (client_op_id) do nothing;
            if found then
              insert into public.rewards (child_id, points_total) values (v_child, 0) on conflict (child_id) do nothing;
              update public.rewards set points_total = points_total + v_award where child_id = v_child;
            end if;
          end if;
        end if;
      end if;
    exception when others then
      continue;
    end;
  end loop;

  -- Shells, the shop, boat looks, the daily chest, hatched eggs, reef buddies, finished tutorials
  -- and gym records.
  for v_item in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) limit 200 loop
    begin
      v_child := nullif(v_item ->> 'child_id', '')::uuid;
      v_op := left(nullif(v_item ->> 'op_id', ''), 120);
      v_type := v_item ->> 'type';
      continue when v_child is null or v_op is null or v_type is null or v_type not in ('earn', 'spend', 'look', 'daily', 'collect', 'best');
      continue when not exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household and c.deleted_at is null);
      v_completed := least(coalesce((v_item ->> 'at')::timestamptz, now()), now() + interval '2 minutes');
      v_amount := greatest(0, least(1000, coalesce((v_item ->> 'amount')::int, 0)));
      v_thing := left(nullif(v_item ->> 'item', ''), 60);
      v_reason := left(nullif(v_item ->> 'reason', ''), 60);
      v_look := null;
      v_data := null;
      if v_type = 'spend' then
        continue when public.learn_balance(v_child) < v_amount; -- can't spend shells you don't have
      elsif v_type = 'daily' then
        continue when exists (select 1 from public.learn_ledger where child_id = v_child and type = 'daily'
                              and (at at time zone v_tz)::date = (v_completed at time zone v_tz)::date);
        v_amount := least(v_amount, 60);
      elsif v_type = 'earn' then
        v_amount := least(v_amount, 150);
        -- Brain Gym pays for at most three rounds a family-day.
        continue when v_reason = 'gym' and (select count(*) from public.learn_ledger where child_id = v_child and type = 'earn' and reason = 'gym'
                                               and (at at time zone v_tz)::date = (v_completed at time zone v_tz)::date) >= 3;
        if v_reason = 'gym' then v_amount := least(v_amount, 15); end if;
      elsif v_type = 'collect' then
        continue when v_thing is null or not (v_thing like 'hatch:%' or v_thing like 'buddy:%' or v_thing like 'tutorial:%');
        v_amount := 0;
        if v_thing like 'hatch:%' then
          v_data := jsonb_build_object(
            'creature', left(coalesce(v_item -> 'data' ->> 'creature', ''), 40),
            'xp', greatest(0, least(10000000, coalesce(((v_item -> 'data' ->> 'xp')::numeric)::int, 0))));
        end if;
      elsif v_type = 'best' then
        continue when v_thing is null or v_thing not like 'gym:%';
      else
        v_amount := 0;
        v_look := jsonb_build_object(
          'hull', left(v_item -> 'look' ->> 'hull', 40), 'sail', left(v_item -> 'look' ->> 'sail', 40), 'flag', left(v_item -> 'look' ->> 'flag', 40),
          'pet', left(v_item -> 'look' ->> 'pet', 40), 'trail', left(v_item -> 'look' ->> 'trail', 40));
      end if;
      insert into public.learn_ledger (household_id, child_id, type, amount, item, reason, look, data, at, client_op_id)
      values (v_household, v_child, v_type, v_amount, v_thing, v_reason, v_look, v_data, v_completed, v_op)
      on conflict (client_op_id) do nothing;
    exception when others then
      continue;
    end;
  end loop;

  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return public.learn_snapshot(v_household, v_tz);
end;
$function$;

revoke all on function public.rpc_learn_sync(uuid, jsonb, jsonb) from public;
grant execute on function public.rpc_learn_sync(uuid, jsonb, jsonb) to anon, authenticated;
