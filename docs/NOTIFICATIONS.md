# Obaveštenja, scheduler i feedback (Faza 5)

Sve poruke klijentima idu kroz tabelu `notifications` (nikad direktno) sa `dedupe_key`, pa ponovljen poziv ne pravi duplikate.

## Tok
| Događaj | Ko pravi poruku | Ključ (`dedupe_key`) | Šablon (WhatsApp) |
|---|---|---|---|
| Plan spreman | `publish-plan` | `plan_ready:<program>:<kanal>` | `ttz_plan_ready` |
| Feedback otvoren (09:00 Beograd na dan 10/20/30) | `scheduler` | `fb:<feedback>:due:<kanal>` | `ttz_feedback_due` |
| Podsetnik +24 h | `scheduler` | `fb:<feedback>:r1:<kanal>` | `ttz_feedback_reminder` |
| +48 h bez odgovora | `scheduler` (status `late`, tim vidi „Kasni“) | — | — |
| Odgovor tima | `team-reply` | `reply:<reply>:<kanal>` | `ttz_team_reply` |
| Najava kraja (dan `trajanje − 2`, 09:00) | `scheduler` | `end:<program>:announce:<kanal>` | `ttz_program_ending` |
| Završni izveštaj objavljen | `publish-report` (samo prvi put) | `report:<program>:<kanal>` | `ttz_report_ready` |

`scheduler` posle dana `trajanje` prebacuje program u `ended`. Pravila su u `supabase/functions/_shared/feedbackRules.ts` (čista funkcija, testirana lažnim vremenom u `src/lib/feedbackRules.test.ts` i `supabase/tests/feedback.test.ts`).

Kanali: `profiles.preferred_channels` (izbor na Dan 1), samo WhatsApp i email; bez izbora ide email. Push (kanal „Aplikacija“) stiže sa PWA u Fazi 9.

## Slanje (`_shared/notify.ts`)
- 3 pokušaja (pauza 5 min × pokušaj), pa status `failed` i greška u `notifications.error`.
- WhatsApp neuspeo (nema broja, Meta greška) → isti sadržaj odmah ide emailom (`…:email`, ako već ne postoji).
- Tim vidi log i dugme „Pošalji ponovo“ na `/tim/obavestenja` (Edge Function `send-notification` sa `retry_id`).

## Secrets (Supabase → Edge Functions)
```
WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_LANG=sr   # Meta WhatsApp Cloud API
RESEND_API_KEY, EMAIL_FROM                            # Resend
APP_URL=https://app.<domen>                           # linkovi u porukama
NOTIFY_DRY_RUN=true                                   # samo lokalno: ništa se ne šalje, poruka se beleži kao poslata
```
WhatsApp template-i se prave unapred u Meta Business Manageru. Parametri: `ttz_plan_ready` {{1}} ime, {{2}} link; `ttz_feedback_due` i `ttz_feedback_reminder` {{1}} ime, {{2}} dan, {{3}} link; `ttz_team_reply` {{1}} ime, {{2}} link; `ttz_program_ending` {{1}} ime, {{2}} preostalo dana, {{3}} link; `ttz_report_ready` {{1}} ime, {{2}} link (šesti template, napravi ga uz ostalih pet).

## pg_cron (svakih 15 min)
Migracija `0006` pravi posao `ttz-scheduler` koji poziva `invoke_scheduler()`. Dok adresa i ključ nisu postavljeni, funkcija ne radi ništa. Po okruženju (ključ nije u kodu ni u gitu):
```sql
alter database postgres set app.scheduler_url = 'https://<projekat>.supabase.co/functions/v1/scheduler';
alter database postgres set app.service_key   = '<service role ključ>';
```
Lokalno scheduler možeš da pozoveš ručno (samo sa service role ključem), opciono sa lažnim vremenom i jednim programom:
`POST /functions/v1/scheduler {"now":"2026-10-14T07:00:00Z","program_id":"…"}`.

## Feedback
- Forma i šema: `src/lib/feedbackSchema.ts` (deli se sa Edge Functions). Slanje: `submit-feedback` (klijent ne menja `feedbacks` direktno, RLS politika je ukinuta) upisuje `answers`, status `submitted` i merenje za taj dan.
- Odgovor tima: `team-reply` (samo tim, odbija grame i kalorije), upisuje `feedback_replies`, status `answered`, poruka na izabrane kanale. Rok tima: 48 h (odbrojavanje na pregledu).

## Kraj programa i nastavak (Faza 7)
- Faze po danu (`programPhase` u `src/lib/programDay.ts`): dani 28–30 „pred kraj“ (otvorena ponuda nastavka), 31–60 samo čitanje (plan i izveštaj), posle toga samo izveštaj i ponuda na `/app/kraj`.
- Rezultati: SQL funkcija `program_results(program_id)` (razlika mera dan 1 → poslednje merenje, dani praćenja = bar pola obroka štikliranih, treninzi, feedbacki). Isti brojevi su na ekranu klijenta, kod tima i u PDF-u.
- Izveštaj: tim piše na `/tim/klijenti/:id/izvestaj` (nacrt ili objava). `publish-report` pravi PDF (Outfit, `supabase/functions/_shared/fonts`; pri deploy-u fontovi idu kroz `static_files` u `config.toml`), čuva ga u bucket `reports` (`<client_id>/<program_id>.pdf`) i šalje poruku klijentu. Nacrt klijent ne vidi.
- Nastavak: `renew-program` pravi novi program (`previous_program_id`, status `awaiting_payment`), uplatu istim tokom kao prvu kupovinu i kopira poslednje važeće obroke (najveći `valid_from_cycle`) i suplemente kao osnovu. Kad admin potvrdi uplatu, prethodni program postaje `renewed`, a novi ide kroz Dan 0 i Dan 1.
