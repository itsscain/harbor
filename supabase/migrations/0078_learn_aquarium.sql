-- Harbor Learn: the Lighthouse on for every child, and My Aquarium.
--   learn_profiles  'faith' joins the default subjects and every existing child's list (the parent
--                   app can still turn it off per child)
--   rpc_learn_sync  collect events may also be 'feed:<food>:<egg>' (a creature fed in the aquarium)
--                   and 'aq:<…>' (aquarium choices, e.g. 'aq:tank:<id>'); purchases (food packs,
--                   eggs, Mystery Egg rolls, decorations, tanks) are ordinary balance-checked spends
--   learn_snapshot  meals come back summed per creature ('fed'), so a child can feed every day for
--                   years without crowding the collected list (which now keeps the newest 2000)

alter table public.learn_profiles alter column subjects set default array['reading', 'math', 'code', 'science', 'manners', 'faith'];
update public.learn_profiles set subjects = array_append(subjects, 'faith') where not ('faith' = any (subjects));

create or replace function public.learn_snapshot(p_household uuid, p_tz text)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object('child_id', p.child_id, 'grade', p.grade, 'subjects', to_jsonb(p.subjects), 'daily_goal', p.daily_goal, 'earn_stars', p.earn_stars, 'daily_limit', p.daily_limit))
      from public.learn_profiles p join public.children c on c.id = p.child_id
      where c.household_id = p_household and c.deleted_at is null), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'child_id', a.child_id, 'lesson_id', a.lesson_id, 'note', a.note, 'created_at', a.created_at) order by a.created_at)
      from public.learn_assignments a
      where a.household_id = p_household and a.status = 'assigned' and a.deleted_at is null), '[]'::jsonb),
    'kids', coalesce((
      select jsonb_object_agg(k.child_id::text, jsonb_build_object(
        'lessons', coalesce((select jsonb_object_agg(x.lesson_id, jsonb_build_array(x.best, x.plays, x.last))
                    from (select lesson_id, max(stars) as best, count(*) as plays, max(completed_at) as last
                          from public.learn_results where child_id = k.child_id group by lesson_id) x), '{}'::jsonb),
        'stickers', coalesce((select jsonb_object_agg(y.sticker, y.n)
                    from (select s.sticker, count(*) as n from (
                            select sticker from public.learn_results where child_id = k.child_id and sticker is not null
                            union all
                            select substr(item, 9) from public.learn_ledger where child_id = k.child_id and type = 'earn' and item like 'sticker:%'
                          ) s group by s.sticker) y), '{}'::jsonb),
        'days', coalesce((select jsonb_agg(z.d order by z.d desc)
                    from (select distinct ((completed_at at time zone p_tz)::date)::text as d from public.learn_results
                          where child_id = k.child_id and completed_at > now() - interval '120 days') z), '[]'::jsonb),
        'xp', (select coalesce(sum(10 + 5 * stars), 0) from public.learn_results where child_id = k.child_id),
        'today', (select count(*) from public.learn_results
                  where child_id = k.child_id
                    and (completed_at at time zone p_tz)::date = (now() at time zone p_tz)::date),
        'skills', coalesce((
          select jsonb_object_agg(s.skill, jsonb_build_array(s.right_n, s.total_n, s.last_at, s.recent))
          from (
            select e.key as skill,
                   sum(((e.value ->> 0)::numeric)::int) as right_n,
                   sum(((e.value ->> 1)::numeric)::int) as total_n,
                   max(r.completed_at) as last_at,
                   left(string_agg(case when (e.value ->> 0)::numeric >= (e.value ->> 1)::numeric then '1' else '0' end, '' order by r.completed_at desc), 6) as recent
            from public.learn_results r
            cross join lateral jsonb_each(case when jsonb_typeof(r.skills) = 'object' then r.skills else '{}'::jsonb end) e
            where r.child_id = k.child_id and jsonb_typeof(e.value) = 'array'
              and jsonb_typeof(e.value -> 0) = 'number' and jsonb_typeof(e.value -> 1) = 'number'
            group by e.key
          ) s), '{}'::jsonb),
        'shells', public.learn_balance(k.child_id),
        'owned', coalesce((select jsonb_agg(distinct l.item) from public.learn_ledger l where l.child_id = k.child_id and l.type = 'spend' and l.item is not null), '[]'::jsonb),
        'look', (select l.look from public.learn_ledger l where l.child_id = k.child_id and l.type = 'look' order by l.at desc limit 1),
        'daily', (select max((l.at at time zone p_tz)::date)::text from public.learn_ledger l where l.child_id = k.child_id and l.type = 'daily'),
        'collected', coalesce((select jsonb_agg(jsonb_build_array(c.item, c.data, c.at) order by c.at)
                    from (select item, data, at from public.learn_ledger where child_id = k.child_id and type = 'collect' and item is not null
                            and item not like 'feed:%' order by at desc limit 2000) c), '[]'::jsonb),
        -- Meals per creature (item 'feed:<food>:<egg>'): [flakes, shrimp, golden, last meal, meals today].
        'fed', coalesce((select jsonb_object_agg(f.egg, jsonb_build_array(f.flakes, f.shrimp, f.golden, f.last, f.today))
                    from (select substr(item, 7 + length(split_part(item, ':', 2))) as egg,
                                 count(*) filter (where split_part(item, ':', 2) = 'flakes') as flakes,
                                 count(*) filter (where split_part(item, ':', 2) = 'shrimp') as shrimp,
                                 count(*) filter (where split_part(item, ':', 2) = 'golden') as golden,
                                 max(at) as last,
                                 count(*) filter (where (at at time zone p_tz)::date = (now() at time zone p_tz)::date) as today
                          from public.learn_ledger where child_id = k.child_id and type = 'collect' and item like 'feed:%'
                          group by 1) f), '{}'::jsonb),
        'bests', coalesce((select jsonb_object_agg(b.game, b.best)
                    from (select substr(item, 5) as game, max(amount) as best from public.learn_ledger
                          where child_id = k.child_id and type = 'best' and item like 'gym:%' group by substr(item, 5)) b), '{}'::jsonb),
        'gym_today', (select count(*) from public.learn_ledger
                      where child_id = k.child_id and type = 'earn' and reason = 'gym'
                        and (at at time zone p_tz)::date = (now() at time zone p_tz)::date)
      ))
      from (select r.child_id from public.learn_results r join public.children c on c.id = r.child_id
            where r.household_id = p_household and c.deleted_at is null
            union
            select l.child_id from public.learn_ledger l join public.children c on c.id = l.child_id
            where l.household_id = p_household and c.deleted_at is null) k), '{}'::jsonb),
    'server_time', now()
  );
$function$;
revoke all on function public.learn_snapshot(uuid, text) from public, anon, authenticated;

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

  -- Shells, the shop, boat looks, the daily chest, hatched eggs, reef buddies, finished tutorials,
  -- aquarium meals and tank choices, and gym records.
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
        continue when v_thing is null or not (v_thing like 'hatch:%' or v_thing like 'buddy:%' or v_thing like 'tutorial:%' or v_thing like 'feed:%' or v_thing like 'aq:%');
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
