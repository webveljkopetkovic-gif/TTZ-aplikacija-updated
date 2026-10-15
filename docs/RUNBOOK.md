# Runbook (šta raditi kad…)

## WhatsApp ne šalje
1. `/tim/obavestenja`: pogledaj status i grešku poruke.
2. Greške: `WhatsApp nije podešen` → secrets (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`). `131xxx`/template → šablon nije odobren ili se parametri ne poklapaju (`docs/NOTIFICATIONS.md`). `Klijent nema broj` → upiši broj u profil.
3. Poruka se posle 3 pokušaja automatski šalje emailom. Ručno: dugme „Pošalji ponovo“.
4. Meta token ističe: napravi trajni token (System User) i `npx supabase secrets set WHATSAPP_TOKEN=...`.
5. Dok se ne reši, odgovori klijentima idu iz aplikacije (feedback odgovor) i emailom.

## Email ne stiže / završava u spamu
Resend → Domains: SPF, DKIM, DMARC moraju biti zeleni. Proveri `EMAIL_FROM` (domen mora biti verifikovan).

## Scheduler ne radi (nema podsetnika za feedback)
1. `select * from cron.job_run_details order by start_time desc limit 5;`
2. Ako je `app.scheduler_url`/`app.service_key` prazno, posao ne radi ništa (DEPLOY.md, korak 4).
3. Ručni poziv: `POST /functions/v1/scheduler` sa service role ključem. Sigurno je ponavljati (dedupe ključevi).

## Dodavanje člana tima
1. Supabase → Authentication → Users → Add user (email + lozinka) ili Invite.
2. SQL: `update profiles set role = 'nutritionist' where email = '...';` (ostale uloge: `trainer`, `admin`, `partner`).
3. Član tima se prijavljuje na `/prijava` i ulazi u `/tim`. Partner vidi samo `/partner`.
4. Odlazak člana tima: obriši korisnika u Authentication ili vrati ulogu na `client`; promeni lozinke deljenih naloga.

## Uplata
Admin potvrđuje na `/tim/uplate` („Uplata primljena“). Poziv webhook-a je idempotentan. Pogrešno potvrđenu uplatu vraća admin kroz SQL (`payments.status`), a program ostaje u `awaiting_payment`.

## Push obaveštenja ne stižu
- Klijent mora da uključi obaveštenja na Početnoj; na iPhone-u tek kad je aplikacija dodata na početni ekran (iOS 16.4+).
- `VAPID_*` secrets moraju biti postavljeni, a `VITE_VAPID_PUBLIC_KEY` isti javni ključ. Promena para ruši postojeće pretplate: klijenti ponovo uključuju obaveštenja.
- Mrtvi uređaji (404/410) se brišu sami.

## Backup i povratak
- Supabase → Database → Backups: dnevni backup; povratak kroz „Restore“ (PITR ako je uključen).
- Ručna kopija: `npx supabase db dump --linked -f backup.sql` (sadrži zdravstvene podatke: čuvaj šifrovano, nikad u git).
- Fajlovi (nalazi, fotografije, izveštaji) su u Storage baketima `labs`, `photos`, `meals`, `reports` i nisu deo SQL dump-a; periodično ih kopiraj (Storage S3 pristup).

## Greške u aplikaciji
Sentry (`VITE_SENTRY_DSN`) prima greške bez ličnih podataka. Za grešku iz funkcija: Supabase → Edge Functions → Logs.

## Privatnost
Zdravstveni podaci samo u Supabase EU. Partner nikad ne vidi zdravstvene podatke (RLS). Zahtev klijenta za brisanje: obriši korisnika u Authentication (kaskadno briše profil, anketu, merenja), pa fajlove iz baketa `<client_id>/`.
