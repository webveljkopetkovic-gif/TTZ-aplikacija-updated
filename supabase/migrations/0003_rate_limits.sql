-- TTZ · 0003: rate limit za javne Edge Functions (submit-intake, upload-intake-file, create-checkout)

create table rate_limits (
  key          text primary key,                -- npr. 'submit-intake:203.0.113.7'
  window_start timestamptz not null default now(),
  count        integer not null default 0
);

alter table rate_limits enable row level security;
-- Tabelu čita i piše samo funkcija ispod (service role). Klijentski pristup je zabranjen.
create policy "rate_limits: nikome" on rate_limits for all using (false) with check (false);

-- Fiksni prozor: vraća false kad je `p_max` poziva u poslednjih `p_window_seconds` sekundi prekoračeno.
create or replace function check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                        then now() else r.window_start end,
    count        = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                        then 1 else r.count + 1 end
  returning r.count into v_count;

  return v_count <= p_max;
end $$;

revoke all on function check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function check_rate_limit(text, integer, integer) to service_role;
