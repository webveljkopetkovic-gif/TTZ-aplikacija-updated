-- TTZ · lokalni seed (SAMO za razvoj). Lozinka svih naloga: Ttz-dev-2026!
-- Datumi su relativni na današnji dan po Europe/Belgrade, pa dani programa uvek odgovaraju opisu.

do $seed$
declare
  v_today date := (now() at time zone 'Europe/Belgrade')::date;
  v_pw    text := 'Ttz-dev-2026!';

  u_olgica  uuid := '00000000-0000-0000-0000-0000000000a1';
  u_ognjen  uuid := '00000000-0000-0000-0000-0000000000a2';
  u_veljko  uuid := '00000000-0000-0000-0000-0000000000a3';
  u_admin   uuid := '00000000-0000-0000-0000-0000000000a4';
  c_jelena  uuid := '00000000-0000-0000-0000-0000000000c1';
  c_ana     uuid := '00000000-0000-0000-0000-0000000000c2';
  c_ivana   uuid := '00000000-0000-0000-0000-0000000000c3';

  prod_nutri uuid := '00000000-0000-0000-0000-0000000000d1';
  prod_train uuid := '00000000-0000-0000-0000-0000000000d2';

  i_jelena uuid := '00000000-0000-0000-0000-0000000000e1';
  i_ana    uuid := '00000000-0000-0000-0000-0000000000e2';
  i_ivana  uuid := '00000000-0000-0000-0000-0000000000e3';

  g_jelena uuid := '00000000-0000-0000-0000-0000000000f1';
  g_ana    uuid := '00000000-0000-0000-0000-0000000000f2';
  g_ivana  uuid := '00000000-0000-0000-0000-0000000000f3';

  t_ir uuid := '00000000-0000-0000-0000-000000000b01';

  r record;
  v_fb10 uuid;
begin
  -- ===================== NALOZI =====================
  for r in
    select * from (values
      (u_olgica, 'olgica@ttz.test', 'Olgica',          'nutritionist'::user_role),
      (u_ognjen, 'ognjen@ttz.test', 'Ognjen',          'trainer'),
      (u_veljko, 'veljko@ttz.test', 'Veljko',          'partner'),
      (u_admin,  'admin@ttz.test',  'Admin',           'admin'),
      (c_jelena, 'jelena@ttz.test', 'Jelena Petrović', 'client'),
      (c_ana,    'ana@ttz.test',    'Ana Marković',    'client'),
      (c_ivana,  'ivana@ttz.test',  'Ivana Jović',     'client')
    ) as t(id, email, full_name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.email,
      extensions.crypt(v_pw, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', r.full_name),
      now(), now(), '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), r.id, r.id::text,
      jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
      'email', now(), now(), now()
    );

    -- profil pravi trigger handle_new_user; ovde samo postavljamo ulogu i telefon
    update profiles set role = r.role, full_name = r.full_name, phone = '+38164' || right(r.id::text, 6) where id = r.id;
  end loop;

  -- ===================== PROIZVODI (cene su privremene) =====================
  insert into products (id, kind, name, price_rsd, duration_days) values
    (prod_nutri, 'nutrition',          'Ishrana + suplementi',          7900,  30),
    (prod_train, 'nutrition_training', 'Ishrana + suplementi + vežbe', 12900, 30);

  -- ===================== ANKETE =====================
  insert into intake_surveys (
    id, client_id, email, phone, full_name, birth_date, sex, occupation, country,
    height_cm, start_weight_kg, activity_level, exercise_level, answers, consent_health, consent_terms, submitted_at
  ) values
    (i_jelena, c_jelena, 'jelena@ttz.test', '+38163100100', 'Jelena Petrović', date '1988-05-02', 'female', 'Učiteljica', 'Srbija',
     165, 78.0, 'light', 'beginner',
     '{"diagnoses":"Hipotireoza","symptoms":["Umor","Opadanje kose"],"allergies":false,"surgery":false,
       "childhood_tonsillitis":"Ne sećam se","pregnancies":"1","fluids":"1–1,5 l","stool":"Na 2–3 dana",
       "bedtime":"23:30","sleep_hours":"6–7 h","outdoor_time":"30–60 min","low_sun_country":"Ne",
       "work_exposure":["Preteran stres"],"disliked_foods":["Riba"],"channels":["whatsapp","email"]}',
     true, true, now() - interval '3 days'),
    (i_ana, c_ana, 'ana@ttz.test', '+38164123456', 'Ana Marković', date '1992-03-14', 'female', 'Ekonomistkinja', 'Srbija',
     168, 70.5, 'sedentary', 'beginner',
     '{"diagnoses":"Insulinska rezistencija","symptoms":["Umor","Nadutost","Gorušica"],"allergies":false,"surgery":false,
       "childhood_tonsillitis":"Ne","pregnancies":"0","fluids":"1–1,5 l","stool":"Da, svaki dan",
       "bedtime":"23:00","sleep_hours":"6–7 h","outdoor_time":"< 30 min","low_sun_country":"Ne",
       "work_exposure":["Ceo dan sedim"],"disliked_foods":["Jetra i iznutrice"],"channels":["whatsapp","email"]}',
     true, true, now() - interval '4 days'),
    (i_ivana, c_ivana, 'ivana@ttz.test', '+38165200200', 'Ivana Jović', date '1985-11-21', 'female', 'Pravnica', 'Srbija',
     172, 81.5, 'moderate', 'intermediate',
     '{"diagnoses":"Štitna žlezda","symptoms":["Umor","Zatvor"],"allergies":true,"allergies_text":"Orasi",
       "surgery":false,"childhood_tonsillitis":"Da","pregnancies":"2","fluids":"1,5–2 l","stool":"Neujednačeno",
       "bedtime":"00:00","sleep_hours":"< 6 h","outdoor_time":"30–60 min","low_sun_country":"Ne",
       "work_exposure":["Rokovi"],"disliked_foods":["Riba","Mahunarke"],"channels":["whatsapp"]}',
     true, true, now() - interval '23 days');

  -- ===================== PROGRAMI =====================
  insert into programs (id, client_id, product_id, intake_id, status, duration_days, exercise_level, plan_focus,
                        paid_at, plan_ready_at, activated_at) values
    (g_jelena, c_jelena, prod_train, i_jelena, 'building_plan', 30, null, null,
       now() - interval '2 days', null, null),
    (g_ana,    c_ana,    prod_train, i_ana,    'active', 30, 'beginner', 'Insulinska rezistencija',
       now() - interval '4 days', now() - interval '1 day', v_today),
    (g_ivana,  c_ivana,  prod_train, i_ivana,  'active', 30, 'intermediate', 'Štitna žlezda',
       now() - interval '23 days', now() - interval '20 days', v_today - 19);

  insert into payments (program_id, client_id, amount_rsd, provider, provider_ref, status, paid_at)
  select id, client_id, 12900, 'manual', 'seed-' || id::text, 'paid', paid_at from programs;

  -- ===================== ŠABLON ISHRANE (14 dana × 5 obroka, bez grama i kalorija) =====================
  insert into meal_templates (id, name, condition, created_by)
  values (t_ir, 'Insulinska rezistencija · 14 dana', 'Insulinska rezistencija', u_olgica);

  insert into meal_template_items (template_id, plan_day, slot, time_of_day, title)
  select t_ir, d, s.slot::meal_slot, s.tod::time, s.titles[d]
  from generate_series(1, 14) as d,
  (values
    ('breakfast', '08:00', array[
      'Jaja i avokado','Ovsena kaša sa cimetom','Omlet sa spanaćem','Grčki jogurt sa orasima',
      'Heljdina kaša sa jabukom','Jaja na oko sa paradajzom','Chia puding sa bobičastim voćem',
      'Kajgana sa povrćem','Ovsene palačinke sa jogurtom','Integralni tost sa avokadom',
      'Proja sa sirom','Skyr sa semenkama','Heljda sa orasima','Jaja sa pečenim paradajzom']),
    ('snack_am', '11:00', array[
      'Jabuka i bademi','Jogurt sa cimetom','Šaka oraha','Kruška i lešnici','Jabuka sa puterom od badema',
      'Kefir','Grčki jogurt sa semenkama','Šargarepa i humus','Jabuka i orasi','Kruška i bademi',
      'Jogurt sa lanom','Krastavac i sir','Šaka badema','Jabuka sa cimetom']),
    ('lunch', '14:00', array[
      'Ćuretina, heljda, salata','Pileći batak i pečeno povrće','Riba sa blitvom','Čorba od sočiva i salata',
      'Ćureći paprikaš sa heljdom','Pileće belo sa brokolijem','Teleći gulaš sa povrćem',
      'Leblebije i salata','Punjene tikvice','Pileći ražnjići i salata','Ćureće belo, kinoa, povrće',
      'Salata sa tunjevinom','Pileće belo sa graškom','Boranija sa ćuretinom']),
    ('snack_pm', '16:30', array[
      'Jabuka','Grčki jogurt','Štapići povrća i humus','Šaka badema','Kefir','Kruška','Šargarepa sa semenkama',
      'Humus i krastavac','Jogurt sa cimetom','Orasi i jabuka','Kefir sa lanom','Paradajz i sir','Bademi',
      'Voće po izboru']),
    ('dinner', '19:30', array[
      'Pileća supa, povrće','Povrtna krem čorba','Salata sa jajima','Pečena tikvica sa sirom',
      'Ćureća šnicla i salata','Omlet sa povrćem','Čorba od sočiva','Pileći ražnjići sa povrćem',
      'Pečeno povrće i feta','Riba i salata','Krem čorba od bundeve','Salata sa tunjevinom',
      'Pileća supa sa rezancima','Pečene tikvice sa ćuretinom'])
  ) as s(slot, tod, titles);

  -- ništa u seedu ne sme da sadrži kalorije, grame ili vaganje (pravilo domena)
  if exists (
    select 1 from meal_template_items
    where title ~* '(kcal|kalorij|vagan|[0-9]\s*(g|gr|kg)\M)'
  ) then
    raise exception 'Seed obroci sadrže kalorije ili grame';
  end if;

  -- plan klijenata = kopija šablona (krug 1)
  insert into program_meals (program_id, plan_day, slot, time_of_day, title, valid_from_cycle, created_by)
  select p.id, i.plan_day, i.slot, i.time_of_day, i.title, 1, u_olgica
  from meal_template_items i, programs p
  where i.template_id = t_ir and p.id in (g_ana, g_ivana);

  -- Ivana: izmena posle feedbacka važi od 2. kruga (plan dan 6, ručak)
  insert into program_meals (program_id, plan_day, slot, time_of_day, title, valid_from_cycle, created_by)
  values (g_ivana, 6, 'lunch', '14:00', 'Ćuretina umesto piletine, manje začina', 2, u_olgica);

  insert into supplements (program_id, name, timing, note)
  select p, n, t, null
  from unnest(array[g_ana, g_ivana]) as p,
       (values ('Vitamin D3', 'uz doručak'), ('Omega-3', 'uz ručak'), ('Magnezijum', 'uveče')) as s(n, t);

  -- ===================== VEŽBE (po 2 za svaki nivo; video_url je placeholder) =====================
  insert into workouts (level, title, duration_min, video_url, description, sort_order) values
    ('beginner',     'Uvod u pokret',          20, 'https://example.com/video/beginner-1',     'Lagano zagrevanje i osnovni pokreti', 1),
    ('beginner',     'Snaga za početnike',     25, 'https://example.com/video/beginner-2',     'Vežbe sa sopstvenom težinom', 2),
    ('intermediate', 'Snaga i stabilnost',     35, 'https://example.com/video/intermediate-1', 'Noge, gluteus i core', 1),
    ('intermediate', 'Gornji deo tela',        35, 'https://example.com/video/intermediate-2', 'Ramena, leđa i ruke', 2),
    ('advanced',     'Kružni trening',         45, 'https://example.com/video/advanced-1',     'Ceo telo u krugovima', 1),
    ('advanced',     'Snaga ceo telo',         50, 'https://example.com/video/advanced-2',     'Složeni pokreti sa opterećenjem', 2);

  -- ===================== MERENJA, FEEDBACK, PORUKE =====================
  insert into measurements (program_id, program_day, weight_kg, waist_cm, energy_am) values
    (g_ana, 1, 70.5, 82.0, 3),
    (g_ivana, 1, 81.5, 90.0, 2),
    (g_ivana, 10, 80.2, 88.5, 3);

  insert into feedbacks (program_id, due_day, due_date, status)
  select g, d, a + d - 1, 'scheduled'
  from (values (g_ana, v_today), (g_ivana, v_today - 19)) as x(g, a), unnest(array[10, 20, 30]) as d;

  update feedbacks set status = 'answered', submitted_at = now() - interval '9 days',
         answers = '{"general":4,"energy":3,"digestion":"bolje","hunger":"uveče","sleep":"6 h","dislikes":["riba"],"exercise":"prija","comment":"Sve ok"}'
   where program_id = g_ivana and due_day = 10
   returning id into v_fb10;

  update feedbacks set status = 'open' where program_id = g_ivana and due_day = 20;

  insert into feedback_replies (feedback_id, author_id, body, sent_channels, sent_at)
  values (v_fb10, u_olgica, 'Bravo, nastavljamo. Od sledećeg kruga menjamo ručak koji ti ne prija.', '{whatsapp,email}', now() - interval '8 days');

  insert into team_notes (client_id, author_id, body) values
    (c_ana, u_olgica, 'Interna beleška: proveriti vitamin D u sledećim nalazima. Klijent ovo ne vidi.');

  insert into messages (client_id, program_id, sender, body, proposed_action, needs_team_review) values
    (c_ana,   g_ana,   'client',    'Mogu li da popijem kafu ujutru?', null, false),
    (c_ana,   g_ana,   'assistant', 'Možeš, jednu kafu uz doručak. Ako ti smeta stomaku, probaj kasnije u toku dana.', null, false),
    (c_ivana, g_ivana, 'client',    'Imam gorušicu posle ručka.', null, false),
    (c_ivana, g_ivana, 'assistant', 'Predlažem ćuretinu umesto piletine uz manje začina. Čeka potvrdu tima.',
       '{"type":"meal_swap","plan_day":6,"slot":"lunch","title":"Ćuretina umesto piletine"}', true);
end
$seed$;
