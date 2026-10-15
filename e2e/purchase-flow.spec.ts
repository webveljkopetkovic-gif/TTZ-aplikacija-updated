/**
 * Glavni tok: landing → anketa (10 koraka: Olgica 1–4, Ognjen 5–9, nalazi i saglasnost 10; jedan PDF) → izbor plana → uplata (manual) → ekran Dan 0.
 * Traži: `npx supabase start` + `npx supabase functions serve` + seed (`db reset`). Dev server pokreće Playwright.
 * Sa SCREENSHOT_DIR=<folder> snima ekrane za poređenje sa design/.
 */
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import pg from 'pg'

const RUN = Date.now()
const EMAIL = `e2e-${RUN}@ttz.test`
const PASSWORD = 'E2e-lozinka-2026'
const SHOTS = process.env.SCREENSHOT_DIR
const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

/** Štiklira checkbox klikom na kvadrat u labeli (nativni input je skriven). */
const tick = (page: Page, text: RegExp) =>
  page.locator('label', { hasText: text }).click({ position: { x: 16, y: 16 } })

const radio = (page: Page, group: string, name: string | RegExp) =>
  page
    .getByRole('radiogroup', { name: group })
    .getByRole('radio', { name, exact: typeof name === 'string' })

async function fillStep1(page: Page, sex: 'Žena' | 'Muškarac') {
  await page.getByLabel('Ime i prezime').fill('E2E Klijent')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Telefon (WhatsApp)').fill('064 555 1234')
  await page.getByLabel('Datum rođenja').fill('1990-03-14')
  await page.getByLabel('Zanimanje').fill('Inženjerka')
  await radio(page, 'Pol', sex).click()
  await page.getByLabel('Telesna visina (cm)').fill('168')
  await page.getByLabel('Težina (kg)').fill('70,5')
}

async function fillStep2(page: Page) {
  await page.getByLabel('Koje dijagnoze imate? Navedite sve.').fill('Insulinska rezistencija')
  await page.getByRole('button', { name: 'Umor' }).click()
  await page.getByRole('button', { name: 'Nadutost' }).click()
  await radio(page, 'Da li imate neke alergije na hranu ili lekove?', 'Ne').click()
  await radio(page, 'Da li ste imali neku operaciju?', 'Ne').click()
  await radio(page, 'Česte upale grla i gnojne angine u detinjstvu', 'Ne sećam se').click()
}

async function fillStep3(page: Page) {
  await radio(page, 'Tečnost dnevno', '1–1,5 l').click()
  // OptionList kartice: korisnik klikće na celu karticu (label), ne na skriveni input
  await page.locator('label', { hasText: /Lagan/ }).click()
  await page.locator('label', { hasText: /Na 2–3 dana/ }).click()
  await page.getByLabel('U koliko sati idete na spavanje?').fill('23:30')
  await radio(page, 'Trajanje sna', '6–7 h').click()
  await radio(page, 'Vreme napolju', '< 30 min').click()
  await radio(page, 'Nedovoljno sunčanih dana', 'Ne').click()
}

/** Koraci 5–9 (Ognjenova pitanja). Segmenti su radio grupe, liste su kartice (klik na labelu). */
async function fillTrainingSteps(page: Page) {
  const next = () => page.getByRole('button', { name: 'Nastavi' }).click()
  const card = (text: RegExp) => page.locator('label', { hasText: text }).click()

  await expect(page).toHaveURL(/\/anketa\/5$/)
  await page.getByRole('button', { name: 'Gubitak telesne masti' }).click()
  await radio(page, 'Mesto treninga', 'Kod kuće').click()
  await next()

  await expect(page).toHaveURL(/\/anketa\/6$/)
  for (const q of [
    'Da li vam je lekar rekao da ograničite fizičku aktivnost?',
    'Da li ste tokom aktivnosti imali bol u grudima, nesvesticu ili neuobičajeno izraženo gušenje?',
    'Da li trenutno imate povredu ili bol koji utiče na vežbanje?',
    'Da li imate medicinsko ograničenje za određene vežbe?',
  ]) {
    await radio(page, q, 'Ne').click()
  }
  await next()

  await expect(page).toHaveURL(/\/anketa\/7$/)
  await card(/^3–12 meseci/)
  await card(/^1–2 puta nedeljno/)
  await card(/^Poznajem neke/)
  await radio(page, 'Pauza duža od 3 meseca u poslednjih godinu dana?', 'Ne').click()
  await next()

  await expect(page).toHaveURL(/\/anketa\/8$/)
  await radio(page, 'Broj sedanja i ustajanja sa kuhinjske stolice', '10–19').click()
  const options = page.locator('[data-field]')
  await options
    .filter({ hasText: 'osloncem na kolena i ruke' })
    .locator('label', { hasText: /^5–10/ })
    .click()
  await options
    .filter({ hasText: 'osloncem na stopala i ruke' })
    .locator('label', { hasText: /^Ne mogu/ })
    .click()
  await options
    .filter({ hasText: 'osloncem na kolena i laktove' })
    .locator('label', { hasText: /^20–44 s/ })
    .click()
  await options
    .filter({ hasText: 'osloncem na stopala i laktove' })
    .locator('label', { hasText: /^Ne znam/ })
    .click()
  await card(/^Da, uz teškoće/)
  await radio(page, 'Bol ili gubitak kontrole tokom čučnja, iskoraka ili skleka', 'Ne').click()
  await next()

  await expect(page).toHaveURL(/\/anketa\/9$/)
  await card(/^Umereno se zadišem/)
  await card(/^20–40 min/)
  await card(/^24–48 sati/)
  await expect(page.getByText('Trake za razvlačenje')).toBeVisible()
  await next()
}

test.afterAll(async () => {
  const db = new pg.Client({ connectionString: DB_URL })
  await db.connect()
  const service = createClient('http://127.0.0.1:54321', SERVICE_KEY, {
    auth: { persistSession: false },
  })
  try {
    const users = await db.query<{ id: string }>(
      `select id from auth.users where email like 'e2e-%'`,
    )
    const paths: string[] = []
    for (const u of users.rows) {
      const { data } = await service.storage.from('labs').list(u.id)
      paths.push(...(data ?? []).map((f) => `${u.id}/${f.name}`))
    }
    if (paths.length) await service.storage.from('labs').remove(paths)
    for (const u of users.rows) await service.auth.admin.deleteUser(u.id)
    await db.query(`delete from intake_surveys where email like 'e2e-%'`)
  } finally {
    await db.end()
  }
})

test.describe.configure({ mode: 'serial' })

test('osvežavanje na koraku 3 zadržava odgovore, a muškarac ne vidi pitanje o trudnoćama', async ({
  page,
}) => {
  await page.goto('/anketa/1')
  await fillStep1(page, 'Muškarac')
  await page.getByRole('button', { name: 'Nastavi' }).click()
  await expect(page).toHaveURL(/\/anketa\/2$/)
  await expect(page.getByText('Broj trudnoća do sad')).toHaveCount(0)

  await fillStep2(page)
  await page.getByRole('button', { name: 'Nastavi' }).click()
  await expect(page).toHaveURL(/\/anketa\/3$/)
  await radio(page, 'Tečnost dnevno', '1,5–2 l').click()
  await page.getByLabel('U koliko sati idete na spavanje?').fill('22:15')

  await page.reload()
  await expect(radio(page, 'Tečnost dnevno', '1,5–2 l')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByLabel('U koliko sati idete na spavanje?')).toHaveValue('22:15')

  // nazad na korak 1: odgovori nisu obrisani
  await page.goto('/anketa/1')
  await expect(page.getByLabel('Ime i prezime')).toHaveValue('E2E Klijent')
  await expect(radio(page, 'Pol', 'Muškarac')).toHaveAttribute('aria-checked', 'true')
})

test('mlađi od 18 godina ne može dalje', async ({ page }) => {
  await page.goto('/anketa/1')
  await fillStep1(page, 'Žena')
  const year = new Date().getFullYear() - 17
  await page.getByLabel('Datum rođenja').fill(`${year}-01-01`)
  await page.getByRole('button', { name: 'Nastavi' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Program je za osobe starije od 18 godina' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/anketa\/1$/)
  await expect(page.getByLabel('Datum rođenja')).toBeFocused()
})

test('landing → anketa → plan → uplata → dan 0', async ({ page, browser }) => {
  await page.evaluate(() => localStorage.clear()).catch(() => undefined)

  // landing
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('12.900 RSD')).toBeVisible()
  await shot(page, '01-landing')
  await page
    .getByRole('link', { name: /Popuni anketu · 5 min/ })
    .first()
    .click()
    .catch(async () => {
      await page.getByRole('link', { name: 'Popuni anketu' }).first().click()
    })
  await expect(page).toHaveURL(/\/anketa\/1$/)
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // korak 1
  await shot(page, '02-anketa-1-prazno')
  await fillStep1(page, 'Žena')
  await shot(page, '02-anketa-1')
  await page.getByRole('button', { name: 'Nastavi' }).click()

  // korak 2
  await expect(page).toHaveURL(/\/anketa\/2$/)
  await fillStep2(page)
  await radio(page, 'Broj trudnoća', '1').click()
  await shot(page, '03-anketa-2')
  await page.getByRole('button', { name: 'Nastavi' }).click()

  // korak 3
  await expect(page).toHaveURL(/\/anketa\/3$/)
  await fillStep3(page)
  await shot(page, '04-anketa-3')
  await page.getByRole('button', { name: 'Nastavi' }).click()

  // korak 4
  await expect(page).toHaveURL(/\/anketa\/4$/)
  await page.getByRole('button', { name: 'Preteran stres' }).click()
  await page.getByRole('button', { name: 'Ceo dan sedim' }).click()
  await page.getByRole('button', { name: 'Riba' }).click()
  await shot(page, '05-anketa-4')
  await page.getByRole('button', { name: 'Nastavi' }).click()

  // koraci 5–9: Ognjenova pitanja
  await fillTrainingSteps(page)

  // korak 10: jedan PDF, kanali i saglasnosti
  await expect(page).toHaveURL(/\/anketa\/10$/)
  await page.getByTestId('lab-file-input').setInputFiles({
    name: 'Krvna slika.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 e2e nalaz'),
  })
  await expect(page.getByText('PDF · 1 KB')).toBeVisible()
  await tick(page, /Saglasna\/saglasan sam/)
  await tick(page, /Pročitao\/la sam/)
  await shot(page, '06-anketa-10')
  await page.getByRole('button', { name: 'Pošalji anketu' }).click()

  // izbor plana i nalog
  await expect(page).toHaveURL(/\/plan\?intake=/)
  await expect(page.getByText(`Nalog se pravi na ${EMAIL}`)).toBeVisible()
  await shot(page, '07-plan')
  await page.getByLabel('Lozinka za aplikaciju').fill(PASSWORD)
  await tick(page, /Saglasan\/na sam/)
  await page.getByRole('button', { name: 'Plati i aktiviraj plan' }).click()

  // instrukcije za uplatu
  await expect(page).toHaveURL(/\/app\/uplata$/)
  await expect(page.getByText('12.900 RSD').first()).toBeVisible()
  const reference = await page.locator('dd', { hasText: /^TTZ-[0-9A-F]{8}$/ }).textContent()
  expect(reference).toMatch(/^TTZ-[0-9A-F]{8}$/)
  await shot(page, '08-uplata')

  // admin potvrđuje uplatu u drugom kontekstu
  const adminContext = await browser.newContext()
  const admin = await adminContext.newPage()
  await admin.goto('/prijava')
  await admin.getByLabel('Email').fill('admin@ttz.test')
  await admin.getByLabel('Lozinka', { exact: true }).fill('Ttz-dev-2026!')
  await admin.getByRole('button', { name: 'Prijavi se' }).click()
  await expect(admin).toHaveURL(/\/tim$/)
  await admin.goto('/tim/uplate')
  const row = admin.getByRole('listitem').filter({ hasText: reference! })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Uplata primljena' }).click()
  await expect(row.getByText('Potvrđeno')).toBeVisible()
  await adminContext.close()

  // klijentski ekran prelazi na dan 0 bez ručnog osvežavanja (status se osvežava na 10 s)
  await expect(page).toHaveURL(/\/app\/priprema$/, { timeout: 25_000 })
  await expect(page.getByRole('heading', { name: /Hvala, E2E\./ })).toBeVisible()
  await expect(page.getByText('Dan 0 · uplata primljena')).toBeVisible()
  await expect(page.getByText(/Anketa poslata/)).toBeVisible()
  await expect(page.getByText('Ognjen bira vežbe')).toBeVisible()
  await expect(page.getByText('PDF ili slika · 1 dodata')).toBeVisible()
  await shot(page, '09-dan-0')
})
