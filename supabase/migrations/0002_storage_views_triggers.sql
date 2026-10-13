-- TTZ · 0002: storage bucketi i politike, view za pregled tima, trigger za profile

-- ===================== STORAGE =====================
-- Svi bucketi su privatni. Putanje: "{client_id}/...". Anketa pre naloga ide u "intake/<id>/..."
-- (upisuje je Edge Function sa service role, klijentske politike je ne pokrivaju).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('labs',    'labs',    false, 10485760, array['application/pdf','image/jpeg','image/png','image/heic']),
  ('photos',  'photos',  false, 10485760, array['image/jpeg','image/png','image/heic','image/webp']),
  ('meals',   'meals',   false, 5242880,  array['image/jpeg','image/png','image/webp']),
  ('reports', 'reports', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Prvi segment putanje je id klijenta
create or replace function is_own_folder(p_name text) returns boolean
language sql stable as $$
  select (storage.foldername(p_name))[1] = auth.uid()::text;
$$;

-- labs i photos: klijent čita i dodaje svoje, tim sve
create policy "labs: klijent čita svoje" on storage.objects for select
  using (bucket_id = 'labs' and is_own_folder(name));
create policy "labs: klijent dodaje svoje" on storage.objects for insert
  with check (bucket_id = 'labs' and is_own_folder(name));
create policy "labs: tim" on storage.objects for all
  using (bucket_id = 'labs' and is_team()) with check (bucket_id = 'labs' and is_team());

create policy "photos: klijent čita svoje" on storage.objects for select
  using (bucket_id = 'photos' and is_own_folder(name));
create policy "photos: klijent dodaje svoje" on storage.objects for insert
  with check (bucket_id = 'photos' and is_own_folder(name));
create policy "photos: tim" on storage.objects for all
  using (bucket_id = 'photos' and is_team()) with check (bucket_id = 'photos' and is_team());

-- reports: klijent čita svoje, piše tim
create policy "reports: klijent čita svoje" on storage.objects for select
  using (bucket_id = 'reports' and is_own_folder(name));
create policy "reports: tim" on storage.objects for all
  using (bucket_id = 'reports' and is_team()) with check (bucket_id = 'reports' and is_team());

-- meals: slike jela vide svi prijavljeni, piše tim
create policy "meals: prijavljeni čitaju" on storage.objects for select
  using (bucket_id = 'meals' and auth.uid() is not null);
create policy "meals: tim" on storage.objects for all
  using (bucket_id = 'meals' and is_team()) with check (bucket_id = 'meals' and is_team());

-- ===================== NOVI KORISNIK → PROFIL =====================
-- Uloga je UVEK 'client'. Višu ulogu dodeljuje samo admin (trigger prevent_role_change).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  insert into reminder_settings (client_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===================== PREGLED TIMA (PLAN.md 4.8) =====================
-- security_invoker: view poštuje RLS pozivaoca, pa ga klijent i partner ne vide kao tim.
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
    where m.client_id = pr.id and m.needs_team_review and m.reviewed_at is null) as pending_review_count
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

revoke all on team_client_overview from anon;
