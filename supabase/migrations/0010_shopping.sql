-- TTZ · 0010: nabavka namirnica. Svaki obrok ima listu namirnica (jedna po redu, bez grama i mera);
-- iz nje aplikacija sastavlja plan nabavke po danima.

alter table meal_template_items add column ingredients text;
alter table program_meals       add column ingredients text;

-- Šablon se kopira zajedno sa namirnicama.
create or replace function apply_meal_template(p_program_id uuid, p_template_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_status program_status;
  v_count  integer;
begin
  if not is_team() then
    raise exception 'Samo tim pravi plan ishrane' using errcode = '42501';
  end if;

  select status into v_status from programs where id = p_program_id;
  if v_status is null then
    raise exception 'Program ne postoji' using errcode = 'P0002';
  end if;
  if v_status not in ('building_plan', 'ready') then
    raise exception 'Šablon se bira samo dok se plan pravi' using errcode = '22023';
  end if;

  delete from program_meals where program_id = p_program_id and valid_from_cycle = 1;

  insert into program_meals (program_id, plan_day, slot, time_of_day, title, description, recipe, ingredients,
                             photo_path, valid_from_cycle, created_by)
  select p_program_id, plan_day, slot, time_of_day, title, description, recipe, ingredients,
         photo_path, 1, auth.uid()
  from meal_template_items
  where template_id = p_template_id;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'Šablon je prazan' using errcode = '22023';
  end if;

  update programs set meal_template_id = p_template_id where id = p_program_id;
  return v_count;
end $$;

-- Zamena obroka (asistent): zamenjeni obrok nema staru listu namirnica.
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
      set title = excluded.title, description = null, recipe = null, ingredients = null, photo_path = null,
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
