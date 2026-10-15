-- TTZ · 0006: feedback, obaveštenja i scheduler
--  * notifications.attempts: broj pokušaja slanja (retry 3×, zatim fallback na email)
--  * klijent više ne menja feedbacks direktno: slanje ide kroz Edge Function submit-feedback (service role),
--    da ne može da menja status, due_date ili tuđ feedback
--  * pg_cron poziva Edge Function scheduler svakih 15 min preko pg_net

alter table notifications add column attempts smallint not null default 0;

drop policy "feedback: šaljem svoj" on feedbacks;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- URL i ključ nisu u kodu: postavljaju se po okruženju (docs/DEPLOY.md), npr.
--   alter database postgres set app.scheduler_url = 'https://<projekat>.supabase.co/functions/v1/scheduler';
--   alter database postgres set app.service_key   = '<service role ključ>';
-- Dok nisu postavljeni, funkcija ne radi ništa.
create or replace function invoke_scheduler() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text := current_setting('app.scheduler_url', true);
  v_key text := current_setting('app.service_key', true);
begin
  if coalesce(v_url, '') = '' or coalesce(v_key, '') = '' then
    return;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := '{}'::jsonb
  );
end;
$$;

revoke all on function invoke_scheduler() from public, anon, authenticated;

select cron.schedule('ttz-scheduler', '*/15 * * * *', $$select public.invoke_scheduler()$$);
