# Deploy (produkcija)

Redosled: Supabase (EU) → secrets → migracije → funkcije → pg_cron → Vercel → domen → provera.
Tajne idu samo u Supabase secrets i Vercel environment variables, nikad u git.

## 1. Supabase projekat
1. supabase.com → New project → region **EU (Frankfurt)**. Sačuvaj lozinku baze u menadžeru lozinki.
2. Settings → Database → Backups: uključi dnevni backup (Pro plan; za PITR dodatno).
3. Authentication → URL Configuration: Site URL `https://app.<domen>`, Redirect URLs isti domen (`/nova-lozinka`).
4. Authentication → Providers: Email uključen (lozinka + magic link). Isključi javnu registraciju ako klijenti ulaze samo kroz anketu.
5. Lokalno poveži projekat: `npx supabase link --project-ref <ref>`.

## 2. Migracije i funkcije
```
npx supabase db push                 # migracije 0001–0008
npx supabase functions deploy        # sve funkcije; publish-report nosi fontove kroz static_files
```
Seed (`supabase/seed.sql`) se NE primenjuje u produkciji (test nalozi `*@ttz.test`). Naloge tima napravi po RUNBOOK-u.

## 3. Secrets (Supabase → Edge Functions → Secrets)
```
npx supabase secrets set \
  APP_URL=https://app.<domen> \
  WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... WHATSAPP_LANG=sr \
  RESEND_API_KEY=... EMAIL_FROM="TTZ <tim@<domen>>" \
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tim@<domen>   AI_BASE_URL=... AI_API_KEY=... AI_MODEL=... AI_DAILY_LIMIT=30
```
Nikad `NOTIFY_DRY_RUN` ni `AI_DRY_RUN` u produkciji.
AI: model je bilo koji OpenAI-kompatibilan API (npr. Qwen: `AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`). Pre deploya `npm run test:ai` mora da prođe svih 15 pitanja sa istim modelom. VAPID par: `npx web-push generate-vapid-keys` (javni ključ ide i u Vercel kao `VITE_VAPID_PUBLIC_KEY`; privatni samo u Supabase).
WhatsApp: u Meta Business Manageru odobri 6 šablona (`ttz_plan_ready`, `ttz_feedback_due`, `ttz_feedback_reminder`, `ttz_team_reply`, `ttz_program_ending`, `ttz_report_ready`), parametri su u `docs/NOTIFICATIONS.md`.
Email: u Resend-u verifikuj domen (SPF, DKIM, DMARC) pre prve poruke.

## 4. pg_cron (scheduler na svakih 15 min)
SQL editor, jednom po okruženju:
```sql
alter database postgres set app.scheduler_url = 'https://<ref>.supabase.co/functions/v1/scheduler';
alter database postgres set app.service_key   = '<service role ključ>';
```
Provera: `select * from cron.job;` (posao `ttz-scheduler`) i `select * from cron.job_run_details order by start_time desc limit 5;`.

## 5. Frontend na Vercel
1. Import repo, framework Vite (`vercel.json` već ima rewrite za SPA, zaštitna zaglavlja i CSP).
2. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable/anon, ne service role!), `VITE_VAPID_PUBLIC_KEY`, `VITE_SENTRY_DSN` (opciono).
3. Domains: dodaj `app.<domen>`, u DNS-u CNAME na `cname.vercel-dns.com`. HTTPS dolazi automatski.
4. Ako menjaš Supabase domen ili dodaješ spoljne servise, dopuni `connect-src`/`img-src` u CSP-u (`vercel.json`).

## 6. Provera posle deploya
- [ ] `https://app.<domen>` se otvara, nema grešaka u konzoli (CSP).
- [ ] Prijava, anketa, plaćanje (uplata na račun) → admin potvrda → plan → Dan 1.
- [ ] `npm run test:rls` protiv produkcije NE pokretati (koristi seed); umesto toga ručno proveri RLS sa test klijentom.
- [ ] Test poruke stižu: WhatsApp i email (`/tim/obavestenja` pokazuje status).
- [ ] Android Chrome: „Instaliraj aplikaciju“; iPhone Safari: „Dodaj na početni ekran“, pa uključi obaveštenja.
- [ ] Offline: uključi avionski režim, aplikacija se otvara i prikazuje traku „Nema interneta“.
- [ ] Partner nalog vidi samo prihode (kad se partner panel napravi).
