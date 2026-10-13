-- TTZ – Tvoj tim zdravlja · početna šema (nacrt za Claude Code, proveri pre produkcije)

create extension if not exists pgcrypto;

-- ===================== ENUMI =====================
create type user_role       as enum ('client', 'nutritionist', 'trainer', 'admin', 'partner');
create type plan_kind       as enum ('nutrition', 'nutrition_training');
create type program_status  as enum ('awaiting_payment', 'building_plan', 'ready', 'active', 'ended', 'renewed', 'cancelled');
create type feedback_status as enum ('scheduled', 'open', 'submitted', 'late', 'answered');
create type exercise_level  as enum ('beginner', 'intermediate', 'advanced');
create type msg_channel     as enum ('whatsapp', 'email', 'app');
create type meal_slot       as enum ('breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner');
create type msg_sender      as enum ('client', 'assistant', 'team');
create type payment_status  as enum ('pending', 'paid', 'failed', 'refunded');

-- ===================== PROFILI I ULOGE =====================
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  role               user_role not null default 'client',
  full_name          text,
  email              text not null,
  phone              text,
  preferred_channels msg_channel[] not null default '{whatsapp,email}',
  timezone           text not null default 'Europe/Belgrade',
  created_at         timestamptz not null default now()
);

create or replace function is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('nutritionist','trainer','admin'));
$$;

create or replace function is_admin_or_partner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','partner'));
$$;

-- ===================== PROIZVODI I ANKETA =====================
create table products (
  id            uuid primary key default gen_random_uuid(),
  kind          plan_kind not null,
  name          text not null,
  price_rsd     integer not null check (price_rsd >= 0),
  duration_days integer not null default 30 check (duration_days > 0),
  active        boolean not null default true
);

-- Anketa se popunjava PRE naloga: email i telefon su obavezni, client_id se veže pri plaćanju.
create table intake_surveys (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references profiles(id) on delete cascade,
  email           text not null,
  phone           text not null,
  full_name       text not null,
  birth_date      date not null,
  sex             text not null check (sex in ('female','male')),
  occupation      text not null,
  country         text not null default 'Srbija',
  height_cm       numeric(5,1) not null check (height_cm between 120 and 220),
  start_weight_kg numeric(5,1) not null check (start_weight_kg between 35 and 250),
  activity_level  text not null check (activity_level in ('sedentary','light','moderate','high')),
  exercise_level  exercise_level not null default 'beginner',  -- izvedeno iz activity_level, Ognjen potvrđuje
  answers         jsonb not null,            -- ostali odgovori po id-jevima iz docs/ANKETA.md
  schema_version  smallint not null default 1,
  consent_health  boolean not null check (consent_health),   -- izričita saglasnost za zdravstvene podatke
  consent_terms   boolean not null check (consent_terms),
  submitted_at    timestamptz not null default now()
);

create table lab_files (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references profiles(id) on delete cascade,
  intake_id    uuid references intake_surveys(id) on delete set null,
  storage_path text not null,                -- bucket 'labs' (privatan)
  label        text,
  uploaded_at  timestamptz not null default now()
);

-- ===================== PROGRAM (jedna kupovina = jedan program) =====================
create table programs (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references profiles(id) on delete cascade,
  product_id          uuid not null references products(id),
  intake_id           uuid references intake_surveys(id),
  previous_program_id uuid references programs(id),   -- nastavak posle dana 30
  status              program_status not null default 'awaiting_payment',
  duration_days       integer not null default 30,
  exercise_level      exercise_level,
  plan_focus          text,                 -- upisuje Olgica u izradi plana, npr. 'Insulinska rezistencija'
  training_weekdays   smallint[] not null default '{1,3,5}',  -- ISO: 1 = ponedeljak
  paid_at             timestamptz,
  plan_ready_at       timestamptz,          -- tim označio da je plan gotov
  activated_at        date,                 -- DAN 1 (Europe/Belgrade)
  ended_at            timestamptz,
  created_at          timestamptz not null default now()
);
create index on programs (client_id, status);

-- Dan programa: 0 dok nije aktiviran
create or replace function program_day(p_activated date, p_on date default (now() at time zone 'Europe/Belgrade')::date)
returns integer language sql immutable as $$
  select case when p_activated is null then 0 else (p_on - p_activated) + 1 end;
$$;

create or replace function plan_day(p_day integer) returns integer language sql immutable as $$
  select case when p_day < 1 then 0 else ((p_day - 1) % 14) + 1 end;
$$;

create or replace function plan_cycle(p_day integer) returns integer language sql immutable as $$
  select case when p_day < 1 then 0 else ((p_day - 1) / 14) + 1 end;
$$;

create table payments (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references programs(id) on delete cascade,
  client_id    uuid not null references profiles(id) on delete cascade,
  amount_rsd   integer not null,
  provider     text not null,              -- npr. 'monri', 'allsecure', 'manual'
  provider_ref text unique,
  status       payment_status not null default 'pending',
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ===================== ISHRANA =====================
create table meal_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                -- npr. 'Insulinska rezistencija · 14 dana'
  condition  text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table meal_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references meal_templates(id) on delete cascade,
  plan_day    smallint not null check (plan_day between 1 and 14),
  slot        meal_slot not null,
  time_of_day time not null,
  title       text not null,
  description text,
  recipe      text,                         -- bez grama i kalorija
  photo_path  text,
  unique (template_id, plan_day, slot)
);

-- Kopija plana za konkretnog klijenta. Izmena posle feedbacka = novi red sa većim valid_from_cycle.
create table program_meals (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references programs(id) on delete cascade,
  plan_day         smallint not null check (plan_day between 1 and 14),
  slot             meal_slot not null,
  time_of_day      time not null,
  title            text not null,
  description      text,
  recipe           text,
  photo_path       text,
  valid_from_cycle smallint not null default 1,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  unique (program_id, plan_day, slot, valid_from_cycle)
);

create table meal_logs (
  program_id  uuid not null references programs(id) on delete cascade,
  program_day smallint not null,
  slot        meal_slot not null,
  done_at     timestamptz not null default now(),
  primary key (program_id, program_day, slot)
);

create table supplements (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name       text not null,
  timing     text not null,                 -- 'uz doručak', 'uveče'
  note       text,
  active     boolean not null default true
);

create table supplement_logs (
  program_id    uuid not null references programs(id) on delete cascade,
  supplement_id uuid not null references supplements(id) on delete cascade,
  program_day   smallint not null,
  taken_at      timestamptz not null default now(),
  primary key (supplement_id, program_day)
);

-- ===================== VEŽBE =====================
create table workouts (
  id           uuid primary key default gen_random_uuid(),
  level        exercise_level not null,
  title        text not null,
  duration_min smallint not null,
  video_url    text not null,
  description  text,
  sort_order   smallint not null default 0
);

create table workout_logs (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references programs(id) on delete cascade,
  workout_id   uuid not null references workouts(id),
  program_day  smallint not null,
  duration_min smallint,
  completed_at timestamptz not null default now()
);

-- ===================== NAPREDAK =====================
create table measurements (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  program_day smallint not null,            -- 1, 10, 20, 30
  weight_kg   numeric(5,1),
  waist_cm    numeric(5,1),
  energy_am   smallint check (energy_am between 1 and 5),
  created_at  timestamptz not null default now(),
  unique (program_id, program_day)
);

create table progress_photos (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references programs(id) on delete cascade,
  program_day  smallint not null,
  angle        text not null check (angle in ('front','side')),
  storage_path text not null,               -- bucket 'photos' (privatan)
  created_at   timestamptz not null default now()
);

-- ===================== FEEDBACK =====================
create table feedbacks (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references programs(id) on delete cascade,
  due_day          smallint not null check (due_day % 10 = 0),
  due_date         date not null,
  status           feedback_status not null default 'scheduled',
  answers          jsonb,
  submitted_at     timestamptz,
  reminder_count   smallint not null default 0,
  last_reminded_at timestamptz,
  unique (program_id, due_day)
);

create table feedback_replies (
  id            uuid primary key default gen_random_uuid(),
  feedback_id   uuid not null references feedbacks(id) on delete cascade,
  author_id     uuid not null references profiles(id),
  body          text not null,
  sent_channels msg_channel[] not null default '{}',
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ===================== PITANJA / AI ASISTENT =====================
create table messages (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references profiles(id) on delete cascade,
  program_id        uuid references programs(id) on delete set null,
  sender            msg_sender not null,
  author_id         uuid references profiles(id),
  body              text not null,
  proposed_action   jsonb,                  -- npr. {"type":"meal_swap","plan_day":6,"slot":"lunch","title":"..."}
  needs_team_review boolean not null default false,
  reviewed_by       uuid references profiles(id),
  reviewed_at       timestamptz,
  review_result     text check (review_result in ('approved','edited','rejected')),
  created_at        timestamptz not null default now()
);
create index on messages (client_id, created_at);
create index on messages (needs_team_review) where needs_team_review;

-- ===================== TIM =====================
create table team_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references profiles(id) on delete cascade,
  author_id  uuid not null references profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references profiles(id) on delete cascade,
  kind          text not null,              -- 'plan_ready','feedback_due','feedback_reminder','team_reply','meal','supplement','workout','program_end'
  channel       msg_channel not null,
  template      text,                       -- naziv odobrenog WhatsApp templata
  payload       jsonb not null default '{}',
  scheduled_for timestamptz not null,
  sent_at       timestamptz,
  status        text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  error         text,
  dedupe_key    text unique                 -- sprečava duple poruke (npr. 'fb:<id>:r1:whatsapp')
);
create index on notifications (status, scheduled_for);

create table reminder_settings (
  client_id   uuid primary key references profiles(id) on delete cascade,
  meals       boolean not null default true,
  supplements boolean not null default true,
  workouts    boolean not null default true,
  workout_time time not null default '18:00'
);

-- ===================== PARTNER (Veljko, 30%) =====================
create or replace view partner_revenue as
select date_trunc('month', p.paid_at) as month,
       pr.kind,
       count(*)                        as sales,
       sum(p.amount_rsd)               as revenue_rsd,
       round(sum(p.amount_rsd) * 0.30) as partner_share_rsd
from payments p
join programs g on g.id = p.program_id
join products pr on pr.id = g.product_id
where p.status = 'paid'
group by 1, 2;
-- View se izvršava sa pravima vlasnika; pristup dati SAMO preko RPC funkcije koja proverava is_admin_or_partner().

create or replace function get_partner_revenue()
returns setof partner_revenue language sql stable security definer set search_path = public as $$
  select * from partner_revenue where is_admin_or_partner();
$$;
revoke all on partner_revenue from anon, authenticated;

-- ===================== RLS =====================
alter table profiles            enable row level security;
alter table products            enable row level security;
alter table intake_surveys      enable row level security;
alter table lab_files           enable row level security;
alter table programs            enable row level security;
alter table payments            enable row level security;
alter table meal_templates      enable row level security;
alter table meal_template_items enable row level security;
alter table program_meals       enable row level security;
alter table meal_logs           enable row level security;
alter table supplements         enable row level security;
alter table supplement_logs     enable row level security;
alter table workouts            enable row level security;
alter table workout_logs        enable row level security;
alter table measurements        enable row level security;
alter table progress_photos     enable row level security;
alter table feedbacks           enable row level security;
alter table feedback_replies    enable row level security;
alter table messages            enable row level security;
alter table team_notes          enable row level security;
alter table notifications       enable row level security;
alter table reminder_settings   enable row level security;

-- pomoćna: da li program pripada trenutnom korisniku
create or replace function owns_program(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from programs where id = p_id and client_id = auth.uid());
$$;

create policy "profil: svoj ili tim"    on profiles for select using (id = auth.uid() or is_team());
create policy "profil: menjam svoj"     on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Ulogu menja samo admin (trigger umesto podupita u politici, da nema rekurzije u RLS)
create or replace function prevent_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and not exists (select 1 from profiles where id = auth.uid() and role = 'admin')
     and auth.uid() is not null then
    raise exception 'Samo admin menja ulogu';
  end if;
  return new;
end $$;
create trigger profiles_role_guard before update on profiles for each row execute function prevent_role_change();
create policy "proizvodi: svi čitaju"   on products for select using (active);
create policy "anketa: svoja ili tim"   on intake_surveys for select using (client_id = auth.uid() or is_team());
-- Insert ankete ide preko Edge Function 'submit-intake' (service role), jer korisnik još nema nalog.
create policy "nalazi: svoji ili tim"   on lab_files for select using (client_id = auth.uid() or is_team());
create policy "nalazi: dodajem svoje"   on lab_files for insert with check (client_id = auth.uid());
create policy "program: svoj ili tim"   on programs for select using (client_id = auth.uid() or is_team());
create policy "program: tim menja"      on programs for update using (is_team());
create policy "uplate: svoje"           on payments for select using (client_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "šabloni: tim"            on meal_templates for all using (is_team()) with check (is_team());
create policy "šablon stavke: tim"      on meal_template_items for all using (is_team()) with check (is_team());
create policy "obroci: čitam svoje"     on program_meals for select using (owns_program(program_id) or is_team());
create policy "obroci: tim menja"       on program_meals for all using (is_team()) with check (is_team());
create policy "log obroka: svoj"        on meal_logs for all using (owns_program(program_id) or is_team()) with check (owns_program(program_id));
create policy "suplementi: čitam"       on supplements for select using (owns_program(program_id) or is_team());
create policy "suplementi: tim"         on supplements for all using (is_team()) with check (is_team());
create policy "log suplemenata: svoj"   on supplement_logs for all using (owns_program(program_id) or is_team()) with check (owns_program(program_id));
create policy "vežbe: prijavljeni"      on workouts for select using (auth.uid() is not null);
create policy "vežbe: tim menja"        on workouts for all using (is_team()) with check (is_team());
create policy "log vežbi: svoj"         on workout_logs for all using (owns_program(program_id) or is_team()) with check (owns_program(program_id));
create policy "mere: svoje"             on measurements for all using (owns_program(program_id) or is_team()) with check (owns_program(program_id));
create policy "slike: svoje"            on progress_photos for all using (owns_program(program_id) or is_team()) with check (owns_program(program_id));
create policy "feedback: čitam"         on feedbacks for select using (owns_program(program_id) or is_team());
create policy "feedback: šaljem svoj"   on feedbacks for update using (owns_program(program_id) and status in ('open','late')) with check (owns_program(program_id));
create policy "feedback: tim"           on feedbacks for update using (is_team());
create policy "odgovori: čitam"         on feedback_replies for select using (is_team() or exists (select 1 from feedbacks f where f.id = feedback_id and owns_program(f.program_id)));
create policy "odgovori: tim piše"      on feedback_replies for insert with check (is_team() and author_id = auth.uid());
create policy "poruke: svoje ili tim"   on messages for select using (client_id = auth.uid() or is_team());
create policy "poruke: klijent piše"    on messages for insert with check (client_id = auth.uid() and sender = 'client');
create policy "poruke: tim piše"        on messages for insert with check (is_team() and sender = 'team');
create policy "poruke: tim potvrđuje"   on messages for update using (is_team());
create policy "beleške: samo tim"       on team_notes for all using (is_team()) with check (is_team());
create policy "obaveštenja: svoja"      on notifications for select using (client_id = auth.uid() or is_team());
create policy "podsetnici: svoji"       on reminder_settings for all using (client_id = auth.uid()) with check (client_id = auth.uid());
-- Partner NEMA nijednu politiku nad zdravstvenim tabelama, samo get_partner_revenue().
