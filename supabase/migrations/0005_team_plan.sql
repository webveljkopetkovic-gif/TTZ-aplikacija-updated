-- TTZ · 0005: izrada plana (Faza 3): izabrani šablon ishrane i kopiranje šablona u program

alter table programs add column meal_template_id uuid references meal_templates(id) on delete set null;

-- Kopira 14 dana šablona u program_meals (krug 1). Samo tim, samo dok plan nije aktivan:
-- aktivnom klijentu se plan menja novim redovima (valid_from_cycle), ne brisanjem.
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

  insert into program_meals (program_id, plan_day, slot, time_of_day, title, description, recipe, photo_path,
                             valid_from_cycle, created_by)
  select p_program_id, plan_day, slot, time_of_day, title, description, recipe, photo_path, 1, auth.uid()
  from meal_template_items
  where template_id = p_template_id;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'Šablon je prazan' using errcode = '22023';
  end if;

  update programs set meal_template_id = p_template_id where id = p_program_id;
  return v_count;
end $$;

revoke all on function apply_meal_template(uuid, uuid) from public, anon;
grant execute on function apply_meal_template(uuid, uuid) to authenticated;

-- Pregled tima: dodata vrsta proizvoda (Ognjen vidi klijente sa vežbama). Nova kolona ide na kraj.
create or replace view team_client_overview with (security_invoker = true) as
select
  pr.id                                                         as client_id,
  pr.full_name,
  g.id                                                          as program_id,
  p.name                                                        as plan_name,
  g.plan_focus,
  g.status                                                      as program_status,
  program_day(g.activated_at)                                   as program_day,
  nf.due_day                                                    as next_feedback_day,
  nf.due_date                                                   as next_feedback_date,
  case
    when g.status = 'awaiting_payment' then 'awaiting_payment'
    when g.status = 'building_plan'    then 'new_plan'
    when g.status = 'ready'            then 'ready'
    when g.status = 'renewed'          then 'renewed'
    when g.status = 'ended'            then 'ended'
    when g.status = 'cancelled'        then 'cancelled'
    when exists (select 1 from feedbacks f where f.program_id = g.id and f.status = 'late')      then 'late'
    when exists (select 1 from feedbacks f where f.program_id = g.id and f.status = 'submitted') then 'feedback_in'
    when program_day(g.activated_at) between 28 and 30 then 'ending'
    else 'active'
  end                                                           as team_status,
  (select count(*) from messages m
    where m.client_id = pr.id and m.needs_team_review and m.reviewed_at is null) as pending_review_count,
  p.kind                                                        as product_kind
from profiles pr
join lateral (
  select * from programs x where x.client_id = pr.id order by x.created_at desc limit 1
) g on true
join products p on p.id = g.product_id
left join lateral (
  select f.due_day, f.due_date from feedbacks f
  where f.program_id = g.id and f.status in ('scheduled','open','late')
  order by f.due_day limit 1
) nf on true
where pr.role = 'client';
