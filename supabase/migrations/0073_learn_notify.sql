-- Harbor Learn → parents' phones. Each finished lesson pings /api/cron/notify-learn (the bearer is
-- read from Vault at run time, so this public repo stays secret-free — same as requests_notify).
-- The route decides what's worth a notification: a mission the parent assigned is done, today's
-- goal is hit, a unit is finished, or a streak milestone — never every single lesson.

create or replace function public.learn_notify()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  begin
    perform net.http_post(
      url := 'https://harbor-liard.vercel.app/api/cron/notify-learn',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'harbor_pulse_secret'), ''),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('result_id', new.id)
    );
  exception when others then
    null; -- a notification must never cost a child their lesson result
  end;
  return new;
end $function$;

-- A trigger function, never a callable RPC.
revoke execute on function public.learn_notify() from public, anon, authenticated;

drop trigger if exists learn_notify_t on public.learn_results;
create trigger learn_notify_t after insert on public.learn_results for each row execute function public.learn_notify();
