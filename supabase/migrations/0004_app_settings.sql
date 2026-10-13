-- TTZ · 0004: podešavanja aplikacije (npr. podaci za ručnu uplatu), čita ih svaki prijavljeni korisnik, menja admin

create table app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "podešavanja: prijavljeni čitaju" on app_settings for select using (auth.uid() is not null);
create policy "podešavanja: admin menja" on app_settings for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
