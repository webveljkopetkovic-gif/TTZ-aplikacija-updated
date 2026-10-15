/**
 * Feedback na 10 dana: klijentkinja (seed: Ivana, dan 20, feedback otvoren) popunjava formu, Olgica ga vidi u
 * pregledu, odgovara (grami se odbijaju), klijentkinja vidi odgovor, a poruka je u logu obaveštenja.
 * Traži: `npx supabase start` + `npx supabase functions serve` (NOTIFY_DRY_RUN=true) + seed (`db reset`).
 */
import { expect, test, type Page } from '@playwright/test'
import pg from 'pg'

const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const PASSWORD = 'Ttz-dev-2026!'
const IVANA = '00000000-0000-0000-0000-0000000000c3'
const IVANA_PROGRAM = '00000000-0000-0000-0000-0000000000f3'

async function resetIvana() {
  const db = new pg.Client({ connectionString: DB_URL })
  await db.connect()
  try {
    await db.query(
      `delete from feedback_replies where feedback_id in (select id from feedbacks where program_id = $1 and due_day = 20)`,
      [IVANA_PROGRAM],
    )
    await db.query(`delete from notifications where client_id = $1`, [IVANA])
    await db.query(`delete from measurements where program_id = $1 and program_day = 20`, [
      IVANA_PROGRAM,
    ])
    await db.query(
      `update feedbacks set status = 'open', answers = null, submitted_at = null, reminder_count = 0
        where program_id = $1 and due_day = 20`,
      [IVANA_PROGRAM],
    )
  } finally {
    await db.end()
  }
}

async function login(page: Page, who: string) {
  await page.goto('/prijava')
  await page.getByLabel('Email').fill(`${who}@ttz.test`)
  await page.getByLabel('Lozinka', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Prijavi se' }).click()
  await expect(page).not.toHaveURL(/\/prijava/)
}

test.beforeAll(resetIvana)
test.afterAll(resetIvana)

test('klijentkinja šalje feedback, Olgica odgovara, klijentkinja vidi odgovor', async ({
  page,
  browser,
}) => {
  // ---- klijentkinja
  await login(page, 'ivana')
  await page.goto('/app/danas')
  await page.getByRole('link', { name: /Feedback za dan 20 je otvoren/ }).click()
  await expect(page).toHaveURL(/\/app\/feedback\/20$/)
  await expect(page.getByRole('heading', { name: 'Feedback · dan 20' })).toBeVisible()

  // prazna forma se odbija
  await page.getByRole('button', { name: 'Pošalji feedback' }).click()
  await expect(page.getByText('Izaberi ocenu od 1 do 5').first()).toBeVisible()

  await page
    .getByRole('radiogroup', { name: 'Kako se osećaš?' })
    .getByRole('radio', { name: '4 od 5' })
    .click()
  await page
    .getByRole('radiogroup', { name: 'Energija ujutru' })
    .getByRole('radio', { name: '2 od 5' })
    .click()
  await page.getByRole('button', { name: 'Gorušica' }).click()
  await page.getByLabel('Šta tačno smeta u ishrani').fill('Posle paradajza u salati za ručak')
  await page.getByRole('button', { name: 'Bol u kolenu' }).click()
  await page.getByLabel('Gde boli').fill('Leva noga pri čučnju')
  await page.getByLabel('Izazovi u poslednjih 10 dana').fill('Uveče sam jako gladna')
  await page.getByLabel('Težina (kg)').fill('79,6')
  await page.getByRole('button', { name: 'Pošalji feedback' }).click()

  await expect(page).toHaveURL(/\/app\/feedback$/)
  await expect(page.getByRole('heading', { name: 'Hvala, poslato je!' })).toBeVisible()

  // ---- Olgica
  const context = await browser.newContext()
  const olgica = await context.newPage()
  await login(olgica, 'olgica')
  await olgica.goto('/tim/feedback')
  await olgica.getByRole('link', { name: /Ivana Jović/ }).click()
  await expect(olgica.getByRole('heading', { name: /Ivana Jović · feedback dan 20/ })).toBeVisible()
  const table = olgica.getByRole('table')
  await expect(table.getByText('Gorušica — Posle paradajza u salati za ručak')).toBeVisible()
  await expect(table.getByText('2/5 ↓')).toBeVisible() // pad energije u odnosu na dan 10 (3/5)
  await expect(table.getByText('79,6 kg')).toBeVisible()

  // pravilo „bez grama“ i u odgovoru
  const reply = olgica.getByLabel('Odgovor klijentu')
  await reply.fill('Jedi 150 g piletine.')
  await olgica.getByRole('button', { name: 'Pošalji i označi pregledano' }).click()
  await expect(olgica.getByRole('alert').filter({ hasText: /Bez grama|grama|kalorij/i })).toBeVisible()

  await reply.fill('Ivana, paradajz izbacujemo iz ručka, umesto njega krastavac.')
  await olgica.getByRole('button', { name: 'Pošalji i označi pregledano' }).click()
  await expect(olgica.getByRole('heading', { name: 'Odgovor je poslat' })).toBeVisible()

  // log obaveštenja: poruka klijentkinji (WhatsApp + email)
  await olgica.goto('/tim/obavestenja')
  await expect(
    olgica.getByRole('row').filter({ hasText: 'Ivana Jović' }).filter({ hasText: 'Odgovor tima' }),
  ).toHaveCount(2)
  await context.close()

  // ---- klijentkinja vidi odgovor
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tim ti je odgovorio' })).toBeVisible()
  await expect(page.getByText('umesto njega krastavac').first()).toBeVisible()
})

test('klijent ne ulazi u pregled feedbacka tima', async ({ page }) => {
  await login(page, 'ana')
  await page.goto('/tim/feedback')
  await expect(page).toHaveURL(/\/app/)
})
