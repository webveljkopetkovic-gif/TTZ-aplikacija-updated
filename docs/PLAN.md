# TTZ – Tvoj tim zdravlja · plan izrade za Claude Code

Ovaj dokument je glavna specifikacija. `CLAUDE.md` je kratak sažetak pravila koji Claude Code čita u svakoj poruci. Šema baze je u `supabase/migrations/0001_init.sql`.

---

## 0. Kako da koristiš ovaj plan

1. Napravi prazan folder `ttz-app`, ubaci u njega `CLAUDE.md`, `docs/PLAN.md` i `supabase/migrations/0001_init.sql`.
2. Napravi folder `design/` i ubaci screenshotove svih ekrana sa canvasa (mobilni i web). Imenuj ih kao ekrane, npr. `design/mobile-home.png`, `design/web-meal-plan.png`, `design/mobile-day-one.png`. Claude Code čita slike i pravi UI po njima.
3. Otvori folder u terminalu i pokreni `claude`.
4. Radi **fazu po fazu** (sekcija 9). Za svaku fazu:
   - uključi plan mode i nalepi prompt faze
   - pročitaj plan koji predloži, ispravi ako treba, pa odobri
   - na kraju faze proveri „Gotovo kad…“ listu, pokreni testove, pa napravi commit
5. Posle svake faze pokreni `/clear` pre sledeće, da kontekst bude čist. `CLAUDE.md` i `PLAN.md` se čitaju ponovo.
6. Kad nešto ne radi: kopiraj grešku u Claude Code i reci „popravi, pa dodaj test koji bi ovo uhvatio“.

---

## 1. Šta gradimo

**Web aplikacija (PWA) na subdomenu** `[app.domen.rs]`. Radi u browseru na laptopu i instalira se na telefon kao aplikacija. Nema App Store / Play Store u prvoj verziji.

### MVP (prva verzija za prave klijente)
- Landing → anketa (email i telefon obavezni, upload nalaza) → izbor plana → plaćanje → nalog
- Dan 0: tim pravi plan (rok do 7 dana), klijent vidi status. Tim šalje plan jednim klikom
- Dan 1: aktivacija (početne mere, slike, podsetnici)
- Klijent: početna za danas, plan ishrane 14 dana, suplementi, vežbe po nivou, tok programa, napredak
- Feedback na 10 dana sa podsetnicima (WhatsApp + email) i odgovorom tima porukom
- Pitanja: AI asistent odgovara odmah, tim potvrđuje izmene
- Tim (Olgica, Ognjen): pregled, dosijei, zdravstveni dosije, feedback za pregled, izrada plana iz šablona, materijali
- Dan 30: završni feedback, izveštaj, nastavak (novi program) ili kraj
- Partner panel (Veljko): samo prihodi i 30% udeo

### Kasnije (ne raditi u MVP)
- Native Android/iOS aplikacija
- Zajednica / grupni chat
- Automatsko generisanje plana ishrane AI-jem (u MVP AI samo predlaže zamene, tim odlučuje)
- Više jezika (arapski tržište)

---

## 2. Uloge

| Uloga | Ko | Vidi | Ne vidi |
|---|---|---|---|
| `client` | klijent | samo svoje podatke, plan, odgovore tima | beleške tima, druge klijente |
| `nutritionist` | Olgica | sve klijente, dosijee, ishranu, suplemente, feedback | partner panel |
| `trainer` | Ognjen | sve klijente (dosije, vežbe, feedback) | partner panel |
| `admin` | vlasnik / Veljko kao developer | sve + podešavanja | — |
| `partner` | Veljko | samo `get_partner_revenue()` (broj prodaja, prihod, 30%) | **nijedan zdravstveni podatak** |

Ulogu dodeljuje samo admin (trigger u bazi). Tim se ne registruje kroz javnu formu.

---

## 3. Arhitektura

```
[Browser / PWA]  React + Vite + TS
      │  supabase-js (Auth, PostgREST, Storage, Realtime)
      ▼
[Supabase]
  ├─ Postgres + RLS (sva pravila pristupa u bazi)
  ├─ Storage: labs/ (nalazi), photos/ (pre/posle), meals/ (slike jela), privatni bucketi + signed URL
  ├─ Edge Functions (Deno):
  │    submit-intake      anketa pre naloga (service role)
  │    create-checkout    pravi plaćanje kod procesora
  │    payment-webhook    potvrda uplate → program 'building_plan'
  │    publish-plan       tim šalje plan → status 'ready' + poruka klijentu
  │    activate-program   klijent otvara plan → activated_at = danas (Dan 1)
  │    scheduler          na 15 min: feedback, podsetnici, rok za plan (dan 5 / 7), kraj programa
  │    send-notification  WhatsApp / email / app, sa retry i dedupe
  │    assistant          AI asistent (Claude API)
  │    team-reply         odgovor tima na feedback → WhatsApp + email
  └─ pg_cron + pg_net → poziva scheduler
[Resend] email · [Meta WhatsApp Cloud API] WhatsApp · [Anthropic API] AI
[Hosting frontenda] Vercel ili Netlify, subdomen preko CNAME
```

Supabase projekat u **EU regionu (Frankfurt)** zbog zdravstvenih podataka.

---

## 4. Logika aplikacije (izvor istine)

### 4.1 Status programa

```
awaiting_payment ──uplata──▶ building_plan ──tim objavi plan──▶ ready ──klijent otvori──▶ active ──dan > duration──▶ ended
                                                                                                         │
                                                                         nova kupovina (nastavak) ◀──────┘──▶ renewed (stari), novi program kreće iz building_plan
```

- `awaiting_payment`: anketa poslata, nalog napravljen, nema uplate. Aplikacija prikazuje samo izbor plana.
- `building_plan` (**dan 0**): uplata prošla. Klijent vidi ekran „Tim pravi tvoj plan“. Tim ima rok **do 7 dana** (Olgica ulazi u temu i pregleda nalaze). Scheduler šalje timu podsetnik ako plan nije objavljen posle 5 dana, a na dan 7 klijent je „Kasni plan“ na pregledu tima.
- `ready`: tim objavio plan. Klijent dobija WhatsApp + email „Plan je spreman“. Prvo otvaranje aplikacije ga vodi na ekran Dan 1.
- `active`: klijent završio ekran Dan 1 (ili samo otvorio plan) → `activated_at = danas`.
- `ended`: posle poslednjeg dana. Klijent vidi izveštaj i ponudu. Pristup za čitanje traje još 30 dana.
- Nastavak: novi red u `programs` sa `previous_program_id`, kopira poslednje važeće obroke kao osnovu, tim ih menja, novi Dan 1.

### 4.2 Brojač dana (`src/lib/programDay.ts`)

```ts
// sve u Europe/Belgrade
programDay(activatedAt, today)   // 0 ako nije aktiviran, inače (today - activatedAt) + 1
planDay(day)                     // ((day - 1) % 14) + 1
planCycle(day)                   // floor((day - 1) / 14) + 1
isFeedbackDay(day)               // day > 0 && day % 10 === 0 && day <= duration
nextFeedbackDay(day)             // sledeći višekratnik 10 ≤ duration
isTrainingDay(date, weekdays)    // ISO dan u nedelji ∈ training_weekdays
daysLeft(day, duration)
```
Iste formule postoje u SQL-u (`program_day`, `plan_day`, `plan_cycle`). Unit testovi moraju pokriti: dan 0, 1, 14, 15, 28, 29, 30, 31, promenu letnjeg/zimskog vremena i ponoć po Beogradu.

### 4.3 Plan ishrane
- Tim bira šablon (`meal_templates`), sistem kopira 14 dana × obroke u `program_meals` (`valid_from_cycle = 1`).
- Obrok za danas = red za `plan_day` i `slot` sa najvećim `valid_from_cycle ≤ planCycle(day)`.
- Izmena posle feedbacka: tim bira „važi od sledećeg kruga“ (novi red, `valid_from_cycle = cycle + 1`) ili „odmah“ (novi red za tekući krug).
- Zamena obroka koju predloži AI ili klijent: `messages.proposed_action`, primenjuje se tek posle potvrde tima.
- **Zabranjeno**: kalorije, grami, makroi, vaganje. Validacija u formi tima i u AI system promptu.

### 4.4 Feedback na 10 dana
- Pri aktivaciji sistem pravi redove u `feedbacks` za dane 10, 20, 30 (`due_date = activated_at + due_day - 1`).
- Dan feedbacka u 09:00 (Beograd): status `open`, poruka `feedback_due` na izabrane kanale.
- Nije popunjen posle 24 h: `feedback_reminder` (jednom).
- Nije popunjen posle 48 h: status `late`, klijent se pojavljuje pod „Kasne“ kod tima.
- Klijent pošalje: status `submitted`, merenje se upisuje u `measurements` (isti dan).
- Tim odgovori u `team-reply`: tekst ide klijentu na WhatsApp i/ili email, upisuje se u `feedback_replies`, status `answered`. Rok tima za odgovor na feedback: **48 h** (potvrdila Olgica; na pregledu tima prikaži odbrojavanje).
- Pitanja forme (verzija 1): opšte stanje 1–5, energija ujutru 1–5, varenje, glad, san, šta ne prija u ishrani (tekst + tagovi), vežbe (prija / ne prija / bol, gde), težina, obim struka, slobodan komentar. Šema u `src/lib/feedbackSchema.ts`.

### 4.5 Podsetnici
| Vrsta | Kada | Kanal |
|---|---|---|
| Plan spreman | odmah posle `publish-plan` | WhatsApp + email |
| Obroci | u vreme obroka iz plana (ako uključeno) | app (push) |
| Suplementi | uz obroke po `timing` | app (push) |
| Trening | `workout_time` na dane treninga | app (push), WhatsApp opciono |
| Feedback | dan 10/20/30 u 09:00, ponovo +24 h | WhatsApp + email + app |
| Odgovor tima | odmah | WhatsApp + email |
| Kraj programa | dan 28 (najava), dan 30 (izveštaj) | WhatsApp + email |

- Sve poruke idu kroz tabelu `notifications` sa `dedupe_key`, nikad direktno.
- WhatsApp poruke koje šalje firma (van 24 h prozora) moraju biti **odobreni template-i** u Meta Business Manageru. Napravi ih unapred: `ttz_plan_ready`, `ttz_feedback_due`, `ttz_feedback_reminder`, `ttz_team_reply`, `ttz_program_ending`.
- Email ide uvek kao rezerva ako WhatsApp ne uspe.

### 4.6 AI asistent
- Edge Function `assistant`, model iz env `ANTHROPIC_MODEL` (npr. `claude-sonnet-5-5`, ili `claude-haiku-4-5-20251001` za niži trošak).
- Kontekst koji dobija: samo polja iz `docs/ANKETA.md` sekcija 7 (ime, pol, starost, fokus plana, alergije, hrana koju ne voli, tečnost, stolica, san, nivo vežbi), današnji dan / plan dan / krug, obroci za danas i sutra, suplementi, nivo vežbi, poslednji odgovor tima. **Nikad** `team_notes`.
- Alati (tool use):
  - `propose_meal_swap(plan_day, slot, new_title, reason)` → `needs_team_review = true`
  - `propose_workout_swap(exercise, replacement, reason)` → `needs_team_review = true`
  - `escalate_to_team(reason, urgency)` → poruka timu, prikaz na pregledu
- Pravila u system promptu: bez kalorija, grama i vaganja · ne postavlja dijagnoze i ne menja terapiju · kod ozbiljnih simptoma (bol u grudima, nesvestica, krv, jak bol, trudnoća, alergijska reakcija) savetuje lekara i eskalira · kratki odgovori na srpskom · uvek kaže kad čeka potvrdu tima.
- Klijent vidi oznaku „Olgica je potvrdila“ / „Čeka potvrdu Ognjena“ (već na dizajnu).
- Limit: npr. 30 poruka dnevno po klijentu, logovanje tokena po poruci.

### 4.7 Kraj programa i nastavak
- Dan 28: najava „još 2 dana“, otvara se ponuda nastavka.
- Dan 30: završni feedback + merenje + slike posle. Tim piše završni izveštaj (rezultati, šta je radilo, predlog). Izveštaj se generiše i kao PDF.
- Nastavak: klijent bira „Nastavi 30 dana“, „Samo ishrana“ ili „Završavam“. Nastavak = nova uplata → novi program → dan 0 → novi Dan 1.
- Ako nema uplate 30 dana posle kraja: pristup samo izveštaju.

### 4.8 Statusi klijenta kod tima (izvedeni, ne čuvaju se)
`Nov plan` (building_plan) · `Aktivan` · `Feedback stigao` (submitted) · `Kasni` (late) · `Pred kraj` (dani 28–30) · `Produžio` / `Završio`.
Napravi SQL view `team_client_overview` koji vraća po klijentu: ime, plan, dan, sledeći feedback, status, broj poruka za potvrdu.

---

## 5. Model podataka

Pun SQL je u `supabase/migrations/0001_init.sql` (testiran na Postgres 16). Ukratko:

| Tabela | Šta čuva |
|---|---|
| `profiles` | korisnik, uloga, telefon, kanali |
| `products` | planovi za prodaju (ishrana / ishrana + vežbe), cena, trajanje |
| `intake_surveys`, `lab_files` | anketa (pre naloga) i nalazi |
| `programs`, `payments` | kupljeni program, statusi, Dan 1, uplate |
| `meal_templates`, `meal_template_items` | Olgicini šabloni 14 dana |
| `program_meals`, `meal_logs` | plan konkretnog klijenta po krugovima, šta je pojeo |
| `supplements`, `supplement_logs` | protokol i štikliranje |
| `workouts`, `workout_logs` | Ognjenovi video treninzi po nivou, odrađeni treninzi |
| `measurements`, `progress_photos` | mere dana 1/10/20/30, slike |
| `feedbacks`, `feedback_replies` | feedback na 10 dana i odgovori tima |
| `messages` | pitanja, AI odgovori, predlozi izmena, potvrde tima |
| `team_notes` | interne beleške (klijent ne vidi) |
| `notifications`, `reminder_settings` | red poruka i podešavanja podsetnika |
| `partner_revenue` + `get_partner_revenue()` | samo za partner panel |

Storage bucketi (svi privatni): `labs`, `photos`, `meals`, `reports`. Putanje `"{client_id}/..."`, politike na `storage.objects` po istom pravilu kao tabele.

---

## 6. Ekrani i rute

Ime ekrana = ime na canvasu. Slike u `design/`.

### Javno
| Ruta | Ekran | Napomena |
|---|---|---|
| `/` | Landing (mobilni + web) | tim sa malim profilnim slikama, „Bez brojanja kalorija“, CTA anketa |
| `/anketa/1` … `/anketa/5` | Anketa 1–5 | Olgicina pitanja, sve po `docs/ANKETA.md` |
| `/plan` | Izbor plana i nalog | izbor proizvoda, lozinka, saglasnost, plaćanje |
| `/prijava` | Prijava | email + lozinka, „zaboravljena lozinka“ |

### Klijent (`/app`, potreban nalog)
| Ruta | Ekran | Prikazuje se kada |
|---|---|---|
| `/app` | preusmerava po statusu programa | |
| `/app/priprema` | Dan 0 · tim pravi plan | `building_plan` |
| `/app/dan-1` | Dan 1 · prvi koraci | `ready` (prvi ulaz) |
| `/app/danas` | Početna | `active` |
| `/app/ishrana` | Plan ishrane 14 dana | dan selektor 1–14, recept, zamena |
| `/app/suplementi` | Suplementi i nalazi | |
| `/app/vezbe`, `/app/vezbe/:id` | Vežbe, vežba u toku, vežbe završene | samo za `nutrition_training` |
| `/app/tok` | Tok programa · dan 1 do 30 | kalendar + vremenska linija |
| `/app/napredak` | Napredak | mere, grafikon, pre/posle |
| `/app/feedback`, `/app/feedback/:day` | Feedback na 10 dana, forma | |
| `/app/pitanja` | Pitanja + AI asistent | |
| `/app/tim`, `/app/tim/olgica` | Tvoj tim, profil | |
| `/app/kraj` | Dan 30 · kraj programa | `ended` ili dan ≥ 30 |

### Tim (`/tim`, uloga nutritionist / trainer / admin)
| Ruta | Ekran |
|---|---|
| `/tim` | Tim – pregled (prekidač Olgica / Ognjen / ceo tim) |
| `/tim/klijenti` | Dosijei klijenata (filteri: svi, feedback stigao, kasni, nov plan) |
| `/tim/klijenti/:id` | Zdravstveni dosije |
| `/tim/klijenti/:id/plan` | Tim – plan za klijenta (šablon, izmene obroka, suplementi, nivo vežbi, „Pošalji plan“) |
| `/tim/feedback/:id` | Pregled feedbacka i odgovor |
| `/tim/pitanja` | Poruke koje čekaju potvrdu |
| `/tim/materijali` | Šabloni ishrane, recepti, video treninzi |

### Partner (`/partner`, uloga partner / admin)
| `/partner` | Partner panel – moj udeo 30% (mesec, broj prodaja, prihod, udeo) |

Mobilni raspored ima donju navigaciju (TabBar), web ima levi sidebar. Isti podaci, responsive layout (breakpoint 1024px).

---

## 7. Integracije

### 7.1 Plaćanje
- Stripe ne radi direktno sa firmama registrovanim u Srbiji, pa ga ne planiraj kao glavni put dok to ne proveriš.
- Realne opcije: domaći procesor kartica preko banke (npr. Monri, AllSecure, NestPay preko banke) ili uplata na račun.
- **Implementacija:** napravi interfejs `PaymentProvider` (`createCheckout`, `verifyWebhook`) i prvo provider `manual`. Klijent dobija instrukcije za uplatu, admin u panelu klikne „Uplata primljena“. Tako MVP radi pre ugovora sa procesorom. Pravi procesor se dodaje kao drugi provider.
- Webhook mora biti idempotentan (`payments.provider_ref unique`).

### 7.2 WhatsApp
- Meta WhatsApp Cloud API: verifikovan Business nalog, poseban broj, odobreni template-i (sekcija 4.5).
- Odgovor tima je duži tekst, pa ide kao template `ttz_team_reply` sa linkom na odgovor u aplikaciji (`/app/feedback/:day`), a pun tekst u emailu.
- Tajne: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`.

### 7.3 Email
- Resend, domen sa SPF/DKIM. Šabloni (React Email): plan spreman, feedback, podsetnik, odgovor tima, izveštaj, reset lozinke.
- Tajna: `RESEND_API_KEY`.

### 7.4 AI
- Anthropic API iz Edge Function, ključ samo u Supabase secrets (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`).
- Nikad ne zovi API iz browsera.

### 7.5 Video vežbi
- Video hosting van Supabase (npr. Bunny Stream, Vimeo ili YouTube unlisted). U bazi samo `video_url`.

---

## 8. Bezbednost i privatnost

- Zdravstveni podaci su posebna kategorija po ZZPL (Zakon o zaštiti podataka o ličnosti). Potrebno: izričita saglasnost u anketi (`consent_health`), politika privatnosti, uslovi korišćenja, mogućnost brisanja naloga i izvoza podataka. Tekstove neka pregleda pravnik.
- RLS na svakoj tabeli. Automatski test: klijent A ne može da pročita ništa od klijenta B; partner ne može da pročita nijednu zdravstvenu tabelu.
- Privatni storage bucketi, signed URL sa kratkim trajanjem.
- Service role ključ samo u Edge Functions.
- Rate limit na `submit-intake`, `assistant`, prijavu.
- Na UI: „Plan podrške ne zamenjuje lekarsku terapiju“ (footer, anketa, AI odgovori kod simptoma).
- Pre lansiranja: OWASP provera (XSS u porukama, IDOR na rutama tima, upload validacija tipa i veličine fajla).

---

## 9. Faze izrade (promptovi za Claude Code)

Svaki prompt nalepi u plan mode. Ne preskači „Gotovo kad…“.

### Faza 0 · Postavka projekta
```
Pročitaj CLAUDE.md i docs/PLAN.md (sekcije 1, 3, 6). Napravi Vite + React + TypeScript projekat u ovom folderu
sa Tailwind, React Router, TanStack Query, React Hook Form, Zod, vite-plugin-pwa, Vitest, Testing Library,
Playwright, ESLint i Prettier. Podesi Tailwind tokene iz CLAUDE.md (boje, font Outfit, radijusi).
Napravi strukturu: src/routes, src/components, src/api, src/lib, src/styles. Dodaj .env.example
(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Inicijalizuj Supabase (npx supabase init) tako da
postojeća migracija u supabase/migrations ostane. Napravi osnovne UI komponente po slikama iz design/:
Button (pill, lime i crni), Card, Chip, Input, Toggle, Avatar, TabBar (mobilni), Sidebar (web).
Napravi stranicu /dev/ui koja prikazuje sve komponente.
```
**Gotovo kad:** `npm run dev` radi, `/dev/ui` izgleda kao dizajn, `npm run build` i `npm run test` prolaze, PWA manifest postoji (ime TTZ, boja #ABF92C).

### Faza 1 · Baza, auth i uloge
```
Pokreni lokalni Supabase i primeni supabase/migrations/0001_init.sql. Generiši tipove u src/lib/database.types.ts.
Dodaj migraciju 0002 sa: storage bucketima (labs, photos, meals, reports, privatni) i politikama na storage.objects
po pravilu "{client_id}/..." (klijent svoje, tim sve), view team_client_overview iz PLAN.md 4.8, i trigger koji pri
registraciji pravi red u profiles. Napravi seed.sql: 2 proizvoda, korisnici olgica (nutritionist), ognjen (trainer),
veljko (partner), 3 klijenta u različitim fazama (dan 0, dan 1, dan 20), jedan šablon ishrane 14 dana × 5 obroka
bez grama i kalorija, 6 video vežbi (po 2 za svaki nivo), suplementi.
Napravi src/lib/programDay.ts po PLAN.md 4.2 sa unit testovima (dan 0, 1, 14, 15, 28, 29, 30, 31, ponoć po Beogradu,
promena vremena). Napravi auth: prijava, odjava, reset lozinke, zaštićene rute po ulozi (/app, /tim, /partner).
Napiši test (Vitest + supabase lokalno) koji dokazuje RLS: klijent A ne vidi klijenta B, partner ne vidi
nijednu zdravstvenu tabelu, klijent ne vidi team_notes.
```
**Gotovo kad:** `npx supabase db reset` radi bez greške sa seedom, RLS testovi prolaze, prijava kao olgica vodi na `/tim`, kao klijent na `/app`.

### Faza 2 · Landing, anketa, izbor plana, plaćanje
```
Napravi javne ekrane po design/: Landing (mobilni i web), Anketa (više koraka, nacrt u localStorage, email i telefon
obavezni, upload nalaza do 10 MB PDF/JPG/PNG, saglasnost za zdravstvene podatke), Izbor plana i nalog, Prijava.
Anketu napravi TAČNO po docs/ANKETA.md (5 koraka, Olgicina pitanja, Zod šema u src/lib/intakeSchema.ts,
uslovna polja, 18+, nacrt bez fajlova).
Edge Function submit-intake (service role, rate limit) čuva anketu i nalaze pre naloga.
Na "Plati i aktiviraj plan": napravi nalog, poveži anketu (client_id), napravi program 'awaiting_payment' i payment.
Napravi PaymentProvider interfejs i provider 'manual' (PLAN.md 7.1): klijent vidi instrukcije za uplatu, admin
u /tim ima dugme "Uplata primljena" koje poziva payment-webhook logiku → program 'building_plan', paid_at.
Posle uplate klijent ide na /app/priprema (Dan 0).
Playwright test: landing → anketa → plan → uplata (manual) → ekran Dan 0.
```
**Gotovo kad:** ceo tok radi lokalno, anketa se vidi u bazi sa nalazima, e2e test prolazi, na telefonu (DevTools 390px) izgleda kao dizajn.

### Faza 3 · Tim: dosijei i izrada plana
```
Napravi konzolu tima po design/ (mobilni i web): Tim – pregled (prekidač Olgica/Ognjen/ceo tim, kartice: feedback
za pregled, kasne, novi planovi), Dosijei klijenata (pretraga, filteri), Zdravstveni dosije (anketa, nalazi sa
signed URL, rezultati, feedback hronologija, aktivan plan, beleške tima), Tim – plan za klijenta.
Izrada plana: izbor šablona kopira 14 dana u program_meals; tim može da izmeni svaki obrok (forma bez polja za grame
ili kalorije; validacija odbija tekst sa "kcal", "kalorij", brojem + "g"); suplementi (dodaj/ukloni, timing);
nivo vežbi i dani treninga. Dugme "Pošalji plan" poziva Edge Function publish-plan: status 'ready', plan_ready_at,
notifikacija 'plan_ready' (za sada samo red u notifications, slanje dolazi u fazi 5).
Ekran Materijali: CRUD šablona ishrane i video vežbi.
```
**Gotovo kad:** Olgica može od klijenta na danu 0 da napravi i pošalje plan za manje od 5 minuta, klijent posle toga vidi ekran Dan 1.

### Faza 4 · Klijent: Dan 1 i svakodnevni rad
```
Napravi klijentske ekrane po design/: Dan 1 · prvi koraci (početne mere → measurements dan 1, slike → photos,
podsetnici → reminder_settings, kanali); na "Sačuvaj i kreni" pozovi activate-program (activated_at = danas po
Beogradu, status 'active', napravi feedbacks za dane 10/20/30). Početna (današnji dan, plan dan, krug, obroci za danas
sa štikliranjem → meal_logs, suplementi → supplement_logs, trening ako je dan treninga, kartica Tok programa).
Plan ishrane 14 dana (selektor dana 1–14, današnji označen, recept, "Zameni obrok" otvara pitanje asistentu).
Suplementi i nalazi. Vežbe, vežba u toku (video + tajmer), vežbe završene → workout_logs. Tok programa (kalendar
dana 1–30: danas, feedback dani, novi krug na 15 i 29, tačka za trening; vremenska linija iz PLAN.md 4.7).
Napredak (mere 1/10/20/30, grafikon, pre/posle). Tvoj tim, profil Olgice.
Sve proračune dana radi samo kroz src/lib/programDay.ts. Web verzija istih ekrana sa sidebarom (breakpoint 1024).
```
**Gotovo kad:** seed klijent na danu 1 vidi Dan 1 i 1. krug; klijent na danu 20 vidi plan dan 6 u 2. krugu; dan 29 je plan dan 1 u 3. krugu. Ručno promeni `activated_at` u bazi i proveri.

### Faza 5 · Feedback, podsetnici, WhatsApp i email
```
Napravi feedback po PLAN.md 4.4: ekran Feedback na 10 dana (sledeći feedback, odbrojavanje, istorija sa odgovorima)
i formu (src/lib/feedbackSchema.ts). Slanje upisuje answers, measurements i status 'submitted'.
Edge Function scheduler (pg_cron svakih 15 min preko pg_net): otvara feedback u 09:00 po Beogradu, podsetnik
posle 24 h, 'late' posle 48 h, najava kraja na dan 28, 'ended' posle poslednjeg dana, podsetnici za trening.
Sve poruke idu kroz tabelu notifications sa dedupe_key. Edge Function send-notification šalje queued poruke:
WhatsApp Cloud API (template-i iz PLAN.md 4.5) i Resend email, retry 3 puta, fallback na email ako WhatsApp padne,
upis sent_at / error. Ekran tima Pregled feedbacka i odgovor: tagovi iz odgovora, polje za Olgicu i Ognjena,
"Pošalji na WhatsApp + email" → team-reply → feedback_replies, status 'answered'.
Napravi test za scheduler sa lažnim vremenom (dan 10 u 08:59, 09:00, +24 h, +48 h) i proveri da nema duplih poruka.
Napravi stranicu /tim/obavestenja sa logom poslatih i neuspelih poruka.
```
**Gotovo kad:** testovi schedulera prolaze, lokalno sa test brojem stiže WhatsApp i email, tim vidi „Kasne“ posle 48 h.

### Faza 6 · AI asistent
```
Napravi Edge Function assistant po PLAN.md 4.6 (Anthropic API, model iz ANTHROPIC_MODEL, tool use:
propose_meal_swap, propose_workout_swap, escalate_to_team). Kontekst gradi server iz baze, nikad team_notes.
System prompt na srpskom sa svim pravilima (bez kalorija i grama, bez dijagnoza, crveni simptomi → lekar + eskalacija).
Ekran Pitanja po design/: poruke, brza dugmad (Zamena obroka, Suplementi, Vežba ne prija), oznake
"Olgica je potvrdila" / "Čeka potvrdu Ognjena". Ekran tima /tim/pitanja: predlozi za potvrdu (odobri, izmeni,
odbij); odobrena zamena obroka pravi red u program_meals za taj dan i krug. Limit 30 poruka dnevno po klijentu,
logovanje tokena. Napiši 15 test pitanja (npr. "koliko kalorija ima ručak", "boli me grudi", "mogu li kafu",
"ne volim ribu") i skriptu koja proverava da odgovori poštuju pravila.
```
**Gotovo kad:** svih 15 test pitanja prolazi, zamena obroka se vidi kod klijenta tek posle potvrde tima.

### Faza 7 · Kraj programa, izveštaj, nastavak
```
Napravi ekran Dan 30 · kraj programa po design/ i tok iz PLAN.md 4.7: rezultati (razlika mera dan 1 → dan 30,
dani praćenja plana, broj treninga), završni izveštaj tima (tim ga piše u /tim/klijenti/:id), PDF izveštaj
(generiši na serveru, čuvaj u bucket reports), izbor nastavka. Nastavak pravi novi program sa previous_program_id,
kopira poslednje važeće obroke kao osnovu i vodi na plaćanje, pa Dan 0. Posle 30 dana bez nastavka klijent vidi
samo izveštaj i ponudu.
```
**Gotovo kad:** seed klijent na danu 30 prolazi ceo tok do novog Dana 1.

### Faza 8 · Partner panel
```
Napravi /partner po design/ (Partner panel – moj udeo 30%): po mesecima broj prodaja po vrsti plana, ukupan prihod,
moj udeo 30%, ukupno za izabrani period, izvoz CSV. Podaci samo preko RPC get_partner_revenue().
Test: partner nalog ne može da pročita profiles, programs, intake_surveys, messages ni jednu drugu tabelu.
```

### Faza 9 · PWA, kvalitet, deploy
```
Završi PWA (ikonice iz logotipa, offline ekran, "Dodaj na početni ekran" uputstvo za Android i iPhone, web push
za podsetnike ako je podržan). Prođi sve ekrane na 390px i 1440px i uporedi sa design/. Pristupačnost: kontrast,
fokus, labele, dugmad ≥ 44px. Dodaj Sentry (ili sličan) za greške. Napravi produkcijski Supabase projekat
(EU region), primeni migracije, postavi secrets, pg_cron. Deploy frontenda na Vercel sa subdomenom [app.domen.rs].
Napiši docs/DEPLOY.md i docs/RUNBOOK.md (šta raditi kad WhatsApp ne šalje, kako dodati člana tima, backup).
Uradi OWASP proveru i popravi nalaze.
```
**Gotovo kad:** checklist iz sekcije 11 je ceo štikliran.

---

## 10. Testiranje

- **Unit:** `programDay.ts`, šeme ankete i feedbacka, validacija „bez grama i kalorija“, pravila schedulera.
- **RLS:** po jedan test za svaku tabelu i ulogu.
- **E2E (Playwright):** landing → anketa → plan → uplata → dan 0 · tim šalje plan · Dan 1 · feedback dan 10 · odgovor tima · kraj programa.
- **AI:** 15 test pitanja (faza 6), pokreću se pre svakog deploya.
- **Ručno na telefonu:** Android Chrome i iPhone Safari, instalacija kao PWA, podsetnici.

---

## 11. Checklist pre lansiranja

- [ ] Produkcijski Supabase u EU, backup uključen
- [ ] Svi secrets postavljeni, nijedan ključ u gitu
- [ ] WhatsApp template-i odobreni, test poruke stižu
- [ ] Email domen verifikovan (SPF, DKIM), poruke ne idu u spam
- [ ] Plaćanje radi (manual ili procesor), webhook idempotentan
- [ ] Politika privatnosti, uslovi, saglasnost za zdravstvene podatke (pregledao pravnik)
- [ ] RLS testovi prolaze na produkciji
- [ ] Olgica i Ognjen imaju naloge i prošli su probni tok sa test klijentom
- [ ] Šabloni ishrane i video vežbe uneti
- [ ] Partner nalog vidi samo prihode
- [ ] Subdomen sa HTTPS, PWA se instalira na telefon

---

## 12. Pitanja za Olgicu i Ognjena (pre faze 2)

1. Trajanje programa: 30 dana ili duže (npr. 60 / 90)? Cena po planu?
2. ~~Rokovi~~ Potvrđeno: izrada plana do 7 dana, odgovor na feedback 48 h.
3. Kojim procesorom kartica naplaćuju (ili uplata na račun za početak)?
4. ~~Pitanja u anketi~~ Stigla od Olgice (13. okt), plan u `docs/ANKETA.md`. Pitanja u feedbacku još treba potvrditi.
5. Koliko šablona ishrane imaju (insulinska rezistencija, štitna žlezda, varenje, mršavljenje…)?
6. Ognjen: koliko video treninga po nivou i u kojem formatu ih snima?
7. Broj telefona za WhatsApp Business (ne sme biti broj koji već koriste u običnom WhatsAppu).
8. Šta klijent vidi posle kraja ako ne nastavi (predlog: izveštaj 30 dana)?
