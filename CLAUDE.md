# TTZ – Tvoj tim zdravlja

Web app (PWA) za health coaching: klijent popuni anketu, kupi plan, tim (Olgica = ishrana i suplementi, Ognjen = vežbe) napravi plan, klijent ga prati 30 dana uz feedback na 10 dana. Detaljan plan: `docs/PLAN.md`. Anketa: `docs/ANKETA.md`. Šema baze: `supabase/migrations/0001_init.sql`.

## Stack
- React 18 + Vite + TypeScript (strict), React Router, TanStack Query, React Hook Form + Zod
- Tailwind CSS (tokeni ispod), vite-plugin-pwa (instalira se na telefon)
- Supabase: Postgres + RLS, Auth (email + lozinka, magic link), Storage, Edge Functions (Deno), pg_cron
- Email: Resend. WhatsApp: Meta WhatsApp Cloud API (template poruke). AI: LLM preko OpenAI-kompatibilnog API-ja iz Edge Function (provajder i model samo u secrets: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`)
- Testovi: Vitest + Testing Library, Playwright za glavne tokove

## Komande (Windows PowerShell)
- `npm run dev` · `npm run build` · `npm run test` · `npm run lint` · `npx playwright test`
- `npx supabase start` · `npx supabase db reset` · `npx supabase functions serve`
- `npm run test:rls` (testovi baze, RLS-a i Edge Functions: traže `supabase start`, seed i pokrenut `npx supabase functions serve`; lokalni nalozi `*@ttz.test`, lozinka `Ttz-dev-2026!`)
- `npm run test:ai` (15 test pitanja za AI asistenta na pravom modelu; ključ u `.env.local` ili `scripts/ai-eval/models.local.json`; pre svakog deploya)
- `npx playwright test` (e2e u instaliranom Chrome-u; traži iste servise, dev server pokreće sam)
- `npx supabase gen types typescript --local > src/lib/database.types.ts`

## Pravila domena (NE KRŠI)
- NIKAD brojanje kalorija, grami ili vaganje hrane. Nigde u UI, planu ni AI odgovorima.
- Tim NE zove klijente. Odgovori idu samo porukom: WhatsApp ili email (i u aplikaciji).
- Rokovi tima: izrada plana do 7 dana od uplate, odgovor na feedback 48 h.
- Dan 1 = dan kad klijent otvori gotov plan (`programs.activated_at`), ne dan uplate. Pre toga je dan 0.
- Dan programa = (danas u Europe/Belgrade − activated_at) + 1. Program traje `duration_days` (default 30).
- Plan ishrane ima 14 dana: `plan_day = ((day − 1) % 14) + 1`, `cycle = floor((day − 1) / 14) + 1`.
- Feedback na dan 10, 20, 30 (+ merenje). Podsetnik u 09:00, ponovo posle 24 h, posle 48 h status `late`.
- AI asistent odgovara odmah, ali svaka izmena plana (zamena obroka, vežbe) važi tek kad je tim potvrdi.
- Beleške tima (`team_notes`) klijent nikad ne vidi. Partner (Veljko) vidi samo prihode, nikad zdravstvene podatke.
- Sve logike dana idu kroz `src/lib/programDay.ts` (jedan izvor istine, pokriven testovima).

## Konvencije
- UI tekst na srpskom latinicom, kod i nazivi u kodu na engleskom.
- Komponente u `src/components`, ekrani u `src/routes`, Supabase pozivi u `src/api/*` preko TanStack Query hookova.
- Svaka tabela ima RLS. Nova tabela bez RLS politike = greška.
- Tajne samo u `.env.local` i Supabase secrets. Nikad u kodu ili gitu.
- Datumi: čuvaj UTC u bazi, prikazuj i računaj dane u `Europe/Belgrade`.
- Pre commita: `npm run lint && npm run test`.

## Dizajn tokeni (svetla tema)
- Pozadina #FFFFFF, kartice #F3F3EF, ivice #E4E4DE, tekst #151515, sekundarni tekst #5E5E66
- Brend zelena #ABF92C (pozadine, dugmad; tekst na njoj uvek #151515), zeleni tekst #3A6B00, grafikoni #4F8A00
- Olgica = zelena, Ognjen = crna (#151515). Font Outfit (400–800). Kartice radius 22–28px, dugmad pill (999px), min. visina dugmeta 44px.
- Dizajn ekrana: slike u `design/` (mobilni 390×844, web 1440). Prati ih tačno.
