-- Harbor Learn: the wall's daily-goal ring counts every lesson finished today (replays too),
-- so learn_snapshot reports each kid's count for today in the family's time zone.

create or replace function public.learn_snapshot(p_household uuid, p_tz text)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object('child_id', p.child_id, 'grade', p.grade, 'subjects', to_jsonb(p.subjects), 'daily_goal', p.daily_goal, 'earn_stars', p.earn_stars))
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
                    from (select sticker, count(*) as n from public.learn_results
                          where child_id = k.child_id and sticker is not null group by sticker) y), '{}'::jsonb),
        'days', coalesce((select jsonb_agg(z.d order by z.d desc)
                    from (select distinct ((completed_at at time zone p_tz)::date)::text as d from public.learn_results
                          where child_id = k.child_id and completed_at > now() - interval '120 days') z), '[]'::jsonb),
        'xp', (select coalesce(sum(10 + 5 * stars), 0) from public.learn_results where child_id = k.child_id),
        'today', (select count(*) from public.learn_results
                  where child_id = k.child_id
                    and (completed_at at time zone p_tz)::date = (now() at time zone p_tz)::date)
      ))
      from (select distinct r.child_id from public.learn_results r
            join public.children c on c.id = r.child_id
            where r.household_id = p_household and c.deleted_at is null) k), '{}'::jsonb),
    'server_time', now()
  );
$function$;

revoke all on function public.learn_snapshot(uuid, text) from public, anon, authenticated;
