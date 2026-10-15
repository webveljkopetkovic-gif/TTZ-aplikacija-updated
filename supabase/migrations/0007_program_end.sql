-- TTZ · 0007: kraj programa, završni izveštaj i rezultati
--  * program_reports: završni izveštaj tima (Olgica, Ognjen), klijent ga vidi tek kad je objavljen
--  * program_results(): rezultati programa (razlika mera dan 1 → poslednje merenje, dani praćenja plana,
--    treninzi, feedbacki), jedna funkcija za ekran klijenta, tim i PDF
--  * nastavak: programs.previous_program_id već postoji, novi program pravi Edge Function renew-program

create table program_reports (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid not null unique references programs(id) on delete cascade,
  author_id      uuid references profiles(id),
  nutrition_note text not null default '',     -- Olgica
  training_note  text not null default '',     -- Ognjen
  recommendation text check (recommendation in ('continue', 'nutrition_only', 'end')),
  results        jsonb,                        -- snimak rezultata u trenutku objave (isti kao u PDF-u)
  pdf_path       text,                         -- bucket 'reports', putanja '<client_id>/<program_id>.pdf'
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table program_reports enable row level security;

-- tim piše nacrt i čita sve; klijent čita samo svoj objavljen izveštaj
create policy "izveštaj: tim"
  on program_reports for all using (is_team()) with check (is_team());
create policy "izveštaj: klijent čita objavljen"
  on program_reports for select using (published_at is not null and owns_program(program_id));

create or replace function program_results(p_program_id uuid) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'duration_days', g.duration_days,
    'start_weight_kg', coalesce(
      (select m.weight_kg from measurements m where m.program_id = g.id and m.program_day = 1), i.start_weight_kg),
    'end_weight_kg', (select m.weight_kg from measurements m
      where m.program_id = g.id and m.program_day > 1 and m.weight_kg is not null order by m.program_day desc limit 1),
    'start_waist_cm', (select m.waist_cm from measurements m where m.program_id = g.id and m.program_day = 1),
    'end_waist_cm', (select m.waist_cm from measurements m
      where m.program_id = g.id and m.program_day > 1 and m.waist_cm is not null order by m.program_day desc limit 1),
    -- dan je „praćen“ kad je štikliran bar pola obroka tog dana (plan_day i krug kao u programDay.ts)
    'followed_days', (
      select count(*) from generate_series(1, g.duration_days) d
      where (select count(*) from meal_logs l where l.program_id = g.id and l.program_day = d)
         >= greatest(1, ceil(coalesce((
              select count(distinct pm.slot) from program_meals pm
              where pm.program_id = g.id
                and pm.plan_day = ((d - 1) % 14) + 1
                and pm.valid_from_cycle <= ((d - 1) / 14) + 1), 0) / 2.0))),
    'workouts_done', (select count(*) from workout_logs w where w.program_id = g.id),
    'feedbacks_done', (select count(*) from feedbacks f
      where f.program_id = g.id and f.status in ('submitted', 'answered')),
    'full_cycles', g.duration_days / 14
  )
  from programs g
  left join intake_surveys i on i.id = g.intake_id
  where g.id = p_program_id;
$$;
