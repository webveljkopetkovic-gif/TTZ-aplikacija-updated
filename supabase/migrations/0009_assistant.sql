-- TTZ · 0009: AI asistent (Faza 6). Provajder modela je u secrets (OpenAI-kompatibilan API), ne u bazi.

-- Klijent više ne piše poruke direktno: sve ide kroz Edge Function `assistant` (limit, kontekst, pravila).
drop policy "poruke: klijent piše" on messages;

-- ===================== TROŠAK MODELA =====================
-- Jedan red po odgovoru asistenta: tokeni i ishod (za izbor modela i kontrolu troška).
create table ai_usage (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid references messages(id) on delete set null,
  client_id     uuid not null references profiles(id) on delete cascade,
  model         text not null,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  calls         smallint not null default 1,          -- broj poziva modela (alati i ponovni pokušaj)
  latency_ms    integer,
  outcome       text not null check (outcome in ('ok', 'retried', 'fallback', 'error')),
  created_at    timestamptz not null default now()
);
create index on ai_usage (created_at);

alter table ai_usage enable row level security;
-- Upisuje samo funkcija (service role); čita samo admin.
create policy "ai trošak: admin čita" on ai_usage for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ===================== DNEVNI LIMIT =====================
-- Broj pitanja klijenta danas (dan po Europe/Belgrade). Zove je samo funkcija `assistant`.
create or replace function client_messages_today(p_client_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from messages
  where client_id = p_client_id
    and sender = 'client'
    and (created_at at time zone 'Europe/Belgrade')::date = (now() at time zone 'Europe/Belgrade')::date;
$$;
revoke all on function client_messages_today(uuid) from public, anon, authenticated;
grant execute on function client_messages_today(uuid) to service_role;

-- ===================== ODLUKA TIMA O PREDLOGU =====================
-- Odobri / izmeni / odbij predlog asistenta. Odobrena zamena obroka pravi red u program_meals od
-- sledećeg pojavljivanja tog dana plana (tekući krug ako dan još nije prošao, inače sledeći krug).
-- Opciona napomena tima ide klijentu kao poruka u Pitanjima.
create or replace function review_assistant_proposal(
  p_message_id uuid,
  p_result     text,
  p_title      text default null,
  p_note       text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_msg       messages%rowtype;
  v_action    jsonb;
  v_type      text;
  v_title     text;
  v_activated date;
  v_day       integer;
  v_plan_day  integer;
  v_cycle     integer;
  v_time      time;
begin
  if not is_team() then
    raise exception 'Samo tim potvrđuje predloge' using errcode = '42501';
  end if;
  if p_result not in ('approved', 'edited', 'rejected') then
    raise exception 'Nepoznata odluka' using errcode = '22023';
  end if;

  select * into v_msg from messages where id = p_message_id for update;
  if v_msg.id is null or not v_msg.needs_team_review then
    raise exception 'Predlog ne postoji' using errcode = 'P0002';
  end if;
  if v_msg.reviewed_at is not null then
    raise exception 'Predlog je već obrađen' using errcode = '22023';
  end if;

  v_action := coalesce(v_msg.proposed_action, '{}'::jsonb);
  v_type   := v_action->>'type';
  v_title  := nullif(trim(coalesce(p_title, '')), '');

  if p_result = 'edited' and v_title is null then
    raise exception 'Upiši izmenu' using errcode = '22023';
  end if;
  if v_title ~* '(kcal|kalorij|vagan|[0-9]\s*(g|gr|kg|ml)\M)' then
    raise exception 'Bez kalorija, grama i vaganja' using errcode = '22023';
  end if;

  if p_result <> 'rejected' and v_type = 'meal_swap' then
    v_title := coalesce(v_title, v_action->>'title');
    select activated_at into v_activated from programs where id = v_msg.program_id;
    v_day := program_day(v_activated);
    if v_day < 1 then
      raise exception 'Program nije aktivan' using errcode = '22023';
    end if;
    v_plan_day := (v_action->>'plan_day')::integer;
    v_cycle := plan_cycle(v_day) + case when v_plan_day < plan_day(v_day) then 1 else 0 end;

    select time_of_day into v_time from program_meals
    where program_id = v_msg.program_id and plan_day = v_plan_day and slot = (v_action->>'slot')::meal_slot
      and valid_from_cycle <= v_cycle
    order by valid_from_cycle desc limit 1;

    insert into program_meals (program_id, plan_day, slot, time_of_day, title, valid_from_cycle, created_by)
    values (v_msg.program_id, v_plan_day, (v_action->>'slot')::meal_slot,
            coalesce(v_time, '12:00'), v_title, v_cycle, auth.uid())
    on conflict (program_id, plan_day, slot, valid_from_cycle) do update
      set title = excluded.title, description = null, recipe = null, photo_path = null,
          created_by = excluded.created_by, created_at = now();

    v_action := v_action || jsonb_build_object('title', v_title, 'applied_cycle', v_cycle);
  elsif p_result = 'edited' and v_type = 'workout_swap' then
    v_action := v_action || jsonb_build_object('replacement', v_title);
  end if;

  update messages
     set proposed_action = v_action, reviewed_by = auth.uid(), reviewed_at = now(), review_result = p_result
   where id = p_message_id;

  if nullif(trim(coalesce(p_note, '')), '') is not null then
    insert into messages (client_id, program_id, sender, author_id, body)
    values (v_msg.client_id, v_msg.program_id, 'team', auth.uid(), trim(p_note));
  end if;

  return v_action;
end $$;

revoke all on function review_assistant_proposal(uuid, text, text, text) from public, anon;
grant execute on function review_assistant_proposal(uuid, text, text, text) to authenticated;
