# Plan: anketa po Olgicinim pitanjima

Status: **plan, spreman za izradu u Claude Code-u.** Izvor pitanja: Olgica, 13. okt 2026. Dizajn: ekrani „Anketa 1–5“ na canvasu (`design/mobile-anketa-1.png` … `design/mobile-anketa-5.png`).

---

## 1. Cilj

Klijent pre kupovine popunjava anketu sa Olgicinim pitanjima. Odgovori idu u zdravstveni dosije, a tim na osnovu njih pravi plan. Anketa mora da:
- ima sva Olgicina pitanja, njenim rečima (samo blago ujednačen oblik „Vi“)
- bude podeljena u 5 kratkih koraka, da se ne odustane na pola
- čuva odgovore dok klijent popunjava (može da nastavi kasnije)
- radi bez naloga (nalog se pravi tek pri kupovini)

## 2. Odluke

| # | Odluka | Zašto |
|---|---|---|
| D1 | 5 koraka: O vama · Zdravlje · Navike i san · Posao i ishrana · Nalazi i saglasnost | po 4–8 pitanja po ekranu |
| D2 | Dodato polje **Pol** (Žena / Muškarac) | potrebno da se pitanje o trudnoćama prikaže samo ženama |
| D3 | Dodato polje **Država u kojoj živite** | uz pitanje o sunčanim danima, i za kasnije tržište |
| D4 | Ime, email i telefon ostaju obavezni (od ranije) | nalog i WhatsApp |
| D5 | Zatvorena pitanja imaju ponuđene odgovore, a uz njih uvek ide polje za slobodan tekst gde ima smisla | brže popunjavanje, a tim i dalje dobija detalje |
| D6 | Nivo vežbi se **izvodi** iz fizičke aktivnosti, Ognjen ga potvrđuje u izradi plana | klijent ne mora da zna šta je „srednji nivo“ |
| D7 | Samo 18+ | maloletnici traže saglasnost roditelja i drugačiji plan |
| D8 | Tekst „tim te zove“ je uklonjen | pravilo: tim ne zove |
| D9 | AI asistent dobija samo mali deo ankete (sekcija 7) | zdravstveni podaci, najmanje moguće |

## 3. Pitanja (izvor istine za `src/lib/intakeSchema.ts`)

Oznake: **\*** obavezno · `if` uslov prikaza.

### Korak 1 · O vama
| id | Pitanje | Tip | Opcije / validacija |
|---|---|---|---|
| `full_name` | Ime i prezime \* | text | 2–80 znakova |
| `email` | Email \* | email | validan email |
| `phone` | Telefon (WhatsApp) \* | tel | E.164, podrazumevano +381 |
| `birth_date` | Datum rođenja \* | date | starost ≥ 18, ≤ 100 |
| `occupation` | Zanimanje \* | text | 2–80 |
| `sex` | Pol \* | izbor | `female` Žena · `male` Muškarac |
| `height_cm` | Telesna visina (cm) \* | broj | 120–220 |
| `weight_kg` | Težina (kg) \* | decimalni broj (zarez ili tačka) | 35–250 |
| `country` | Država u kojoj živite \* | izbor sa pretragom | podrazumevano Srbija |

### Korak 2 · Zdravlje
| id | Pitanje | Tip | Opcije / validacija |
|---|---|---|---|
| `diagnoses` | Koje dijagnoze imate? Navedite sve. \* | tekst (2 reda) | ili štiklirano „Nemam dijagnoza“ |
| `symptoms` | Problemi sa zdravljem i simptomi (označite sve kojih se setite) | više izbora | Umor, Opadanje kose, Nadutost, Glavobolja, Loš san, Gorušica, Zatvor, Nervoza, Suva koža, Promene raspoloženja, Ostalo |
| `symptoms_other` | Još neki simptom? | tekst | obavezno ako je izabrano „Ostalo“ |
| `allergies` | Da li imate neke alergije na hranu ili lekove? \* | Da / Ne | |
| `allergies_text` | Koje? | tekst | `if allergies = Da`, obavezno |
| `therapy_past` | Šta ste do sad koristili od terapije? | tekst | |
| `therapy_current` | Šta koristite trenutno? | tekst | |
| `surgery` | Da li ste imali neku operaciju? \* | Da / Ne | |
| `surgery_text` | Koju i kada | tekst | `if surgery = Da`, obavezno |
| `childhood_tonsillitis` | Da li ste kao dete imali česte upale grla i gnojne angine? \* | izbor | Da · Ne · Ne sećam se |
| `pregnancies` | Broj trudnoća do sad \* | izbor | 0 · 1 · 2 · 3 · 4+ · `if sex = female` |

### Korak 3 · Navike i san
| id | Pitanje | Tip | Opcije |
|---|---|---|---|
| `fluids` | Koliko tečnosti unosite dnevno? \* (voda, čaj, supe; bez kafe i sokova) | izbor | < 1 l · 1–1,5 l · 1,5–2 l · > 2 l |
| `activity` | Kakav vam je nivo fizičke aktivnosti? \* | izbor sa opisom | Sedeći · Lagan · Umeren (2–3× nedeljno) · Visok (4+ nedeljno) |
| `stool` | Da li imate redovnu stolicu? \* | izbor | Da, svaki dan · Na 2–3 dana · Ređe od toga · Neujednačeno |
| `bedtime` | U koliko sati idete na spavanje? \* | vreme | |
| `sleep_hours` | Koliko okvirno traje san? \* | izbor | < 6 h · 6–7 h · 7–8 h · > 8 h |
| `outdoor_time` | Koliko vremena dnevno provodite napolju? \* | izbor | < 30 min · 30–60 min · 1–2 h · > 2 h |
| `low_sun_country` | Da li živite u državi u kojoj nema dovoljno sunčanih dana? \* | izbor | Da · Ne · Ne znam |

### Korak 4 · Posao i ishrana
| id | Pitanje | Tip | Opcije |
|---|---|---|---|
| `work_exposure` | Da li ste na poslu izloženi nečemu od ovoga? | više izbora | Hemikalije, Preteran stres, Rokovi, Mobing, Noćne smene, Ceo dan sedim, Ništa od navedenog (isključuje ostale) |
| `work_other` | Nešto drugo vezano za posao? | tekst | |
| `disliked_foods` | Hrana koju izrazito ne volite | više izbora | Riba, Jetra i iznutrice, Mleko, Jaja, Pečurke, Prokelj i kupus, Mahunarke |
| `disliked_other` | Još nešto što ne volite? | tekst | |
| `notes` | Napomena: nešto što je od značaja, a nisam pitala | tekst (4 reda) | do 2000 znakova |

### Korak 5 · Nalazi i saglasnost
| id | Pitanje | Tip | Validacija |
|---|---|---|---|
| `lab_files` | Krvne slike i izveštaji lekara | upload (više fajlova) | PDF, JPG, PNG, HEIC; do 10 MB po fajlu; do 10 fajlova; nije obavezno |
| `channels` | Gde da vam stižu poruke tima? \* | više izbora | WhatsApp, Email (bar jedan) |
| `consent_health` | Saglasnost za zdravstvene podatke i nalaze \* | checkbox | mora biti štiklirano |
| `consent_terms` | Politika privatnosti i uslovi korišćenja \* | checkbox | mora biti štiklirano |

## 4. Ponašanje forme

- Na svakom „Nastavi“ validira se samo taj korak. Greška se prikazuje ispod polja, crvenom (#B42A18), i fokus ide na prvo pogrešno polje.
- Nacrt se čuva u `localStorage` (ključ `ttz_intake_draft_v1`) posle svake promene, **bez fajlova**. Fajlovi se odmah šalju na server (privremeni upload) i u nacrtu stoji samo njihov id.
- Povratak na raniji korak ne briše odgovore.
- Uslovna polja (`allergies_text`, `surgery_text`, `pregnancies`, `symptoms_other`) se brišu iz odgovora ako uslov prestane da važi.
- Mlađi od 18: posle datuma rođenja poruka „Program je za osobe starije od 18 godina“ i ne može dalje.
- „Pošalji anketu“ poziva Edge Function `submit-intake`, briše nacrt i vodi na izbor plana (`/plan?intake=<id>`).
- Za fajlove: privatni bucket `labs`, putanja `intake/<intake_id>/<uuid>.<ext>`. Posle kupovine se premešta u `<client_id>/...`. Neplaćene ankete i njihovi fajlovi brišu se posle 30 dana (scheduler).

## 5. Izvedena polja

| Polje | Pravilo |
|---|---|
| `age` | iz `birth_date`, računa se pri prikazu (ne čuva se) |
| `exercise_level` | Sedeći ili Lagan → `beginner` · Umeren → `intermediate` · Visok → `advanced`. Ognjen menja u izradi plana. |
| `programs.plan_focus` | **ne dolazi iz ankete.** Olgica ga upisuje u izradi plana (npr. „Insulinska rezistencija“). Prikazuje se klijentu i timu. |

## 6. Gde se odgovori vide

- **Zdravstveni dosije (tim):** kratki pregled (11 redova, kao na dizajnu) + dugme „Svi odgovori iz ankete (19)“ koje otvara sve odgovore po koracima. Prikaz: Godine · posao, Dijagnoze, Simptomi, Alergije, Terapija sada, Visina · start, Aktivnost, San · stolica, Tečnost · napolju, Posao, Ne voli.
- **Izrada plana (tim):** uz šablon ishrane uvek su vidljive alergije i hrana koju klijent ne voli. Ako obrok iz šablona sadrži nešto sa liste „ne voli“ (prosto poređenje reči), obrok se označi da ga Olgica zameni.
- **Klijent:** vidi svoje odgovore u profilu i može da zatraži izmenu (ide timu kao poruka). Sam ih ne menja posle slanja.

## 7. Šta dobija AI asistent

Samo: ime, pol, starost, `plan_focus`, alergije, hrana koju ne voli, tečnost, stolica, san, nivo vežbi.
**Nikad:** dijagnoze u celini, terapija, operacije, trudnoće, angine, posao/mobing, napomena, nalazi.

## 8. Model podataka

Izmene su već unete u `supabase/migrations/0001_init.sql`:
- `intake_surveys`: nove kolone `birth_date`, `sex`, `occupation`, `country`, `activity_level`, `consent_terms`, `schema_version`; uklonjeni `main_issue` i `goals`; obavezni `height_cm`, `start_weight_kg`. Svi ostali odgovori su u `answers jsonb` po id-jevima iz sekcije 3.
- `programs`: nova kolona `plan_focus`.
- Verzija ankete: `schema_version = 1`. Kad Olgica promeni pitanja, povećava se verzija, a stari odgovori se prikazuju po svojoj verziji.

## 9. Fajlovi

| Fajl | Šta |
|---|---|
| `src/lib/intakeSchema.ts` | Zod šema po koracima + tipovi + liste opcija sa labelama (sr) |
| `src/lib/intakeDerived.ts` | `ageFromBirthDate`, `exerciseLevelFromActivity`, `intakeSummary` (11 redova za dosije) |
| `src/routes/anketa/*` | `AnketaLayout` (napredak, nazad), `Step1About` … `Step5Consent` |
| `src/components/form/*` | `ChoiceChips`, `Segmented`, `OptionList`, `YesNoWithText`, `FileUploadList`, `FieldError` |
| `src/hooks/useIntakeDraft.ts` | čuvanje i vraćanje nacrta |
| `supabase/functions/submit-intake/index.ts` | validacija istom šemom (deljeni fajl), rate limit, upis, vraća `intake_id` |
| `supabase/functions/upload-intake-file/index.ts` | potpisani upload u `labs/intake/<id>/` |
| `src/routes/tim/klijenti/IntakeSummary.tsx` | kratki pregled + svi odgovori |

## 10. Redosled izrade

1. Zod šema + izvedena polja + unit testovi
2. Komponente forme (po dizajnu)
3. Pet koraka + layout + nacrt
4. Upload nalaza + Edge Functions
5. Povezivanje sa izborom plana (`intake_id`)
6. Pregled ankete u dosijeu tima + upozorenje „ne voli“ u izradi plana
7. Testovi (sekcija 11)

## 11. Testovi

- Unit: svaka validacija iz sekcije 3; 17 godina ne prolazi, 18 prolazi; „Ništa od navedenog“ isključuje ostale; uslovna polja se brišu kad uslov nestane; mapiranje aktivnosti u nivo.
- Komponente: tastatura i čitač ekrana (labele, `aria-pressed`, greške vezane za polje).
- E2E: popuni 5 koraka sa jednim PDF-om → izbor plana; osveži stranicu na koraku 3 → odgovori su tu; muškarac ne vidi pitanje o trudnoćama.
- RLS: anon ne može da čita `intake_surveys` ni `labs`.

## 12. Prompt za Claude Code

```
Pročitaj CLAUDE.md, docs/PLAN.md (sekcije 4, 6, 8) i docs/ANKETA.md. Napravi anketu tačno po docs/ANKETA.md
i slikama design/mobile-anketa-1.png do -5.png (i web verziju istih koraka, forma u kartici max širine 640px).
Prati redosled iz sekcije 10. Jedna Zod šema (src/lib/intakeSchema.ts) koristi se i u formi i u Edge Function
submit-intake. Nacrt u localStorage bez fajlova, fajlovi odmah na server. Uslovna polja i pravilo 18+ po sekciji 4.
Na kraju napravi pregled ankete u zdravstvenom dosijeu tima (sekcija 6) i upozorenje u izradi plana kad obrok
sadrži hranu koju klijent ne voli. Napiši sve testove iz sekcije 11. Ne menjaj tekstove pitanja bez pitanja.
```

## 13. Pitanja za Olgicu (nisu blokirajuća)

1. Da li da dodamo pitanje „Šta želite da postignete?“ (cilj)? Sada ga nema u njenoj listi.
2. Da li su ponuđeni simptomi i lista hrane u redu ili želi svoje?
3. Opcije za tečnost, san i vreme napolju: da li joj odgovaraju ovi rasponi?
4. „Napomena: …a nisam pitala“ je u njenom glasu. Da li tako ostaje ili „…a nismo pitali“?
