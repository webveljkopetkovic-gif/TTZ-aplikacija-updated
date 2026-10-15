/**
 * Tim pravi i šalje plan: Olgica otvara dosije klijentkinje na danu 0 (seed: Jelena), bira šablon ishrane,
 * proverava pravilo „bez grama“, bira nivo vežbi i šalje plan. Klijentkinja posle toga prelazi na Dan 1.
 * Traži: `npx supabase start` + `npx supabase functions serve` + seed (`db reset`).
 */
import { expect, test, type Page } from '@playwright/test'
import pg from 'pg'

const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const PASSWORD = 'Ttz-dev-2026!'
const JELENA_PROGRAM = '00000000-0000-0000-0000-0000000000f1'
const JELENA = '00000000-0000-0000-0000-0000000000c1'

async function resetJelena() {
  const db = new pg.Client({ connectionString: DB_URL })
  await db.connect()
  try {
    await db.query(`delete from notifications where client_id = $1`, [JELENA])
    await db.query(`delete from program_meals where program_id = $1`, [JELENA_PROGRAM])
    await db.query(
      `update programs set status = 'building_plan', plan_ready_at = null, meal_template_id = null,
              exercise_level = null, training_weekdays = '{1,3,5}', plan_focus = null where id = $1`,
      [JELENA_PROGRAM],
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

test.beforeAll(resetJelena)
test.afterAll(resetJelena)

test('Olgica pravi i šalje plan, klijentkinja ga dobija', async ({ page, browser }) => {
  await login(page, 'olgica')
  await expect(page).toHaveURL(/\/tim$/)
  await expect(
    page.getByRole('heading', { name: /Novi planovi|Feedback za pregled/ }).first(),
  ).toBeVisible()

  // dosijei → Jelena
  await page.goto('/tim/klijenti?filter=new_plan')
  await page.getByRole('link', { name: /Jelena Petrović/ }).click()
  await expect(page.getByRole('heading', { name: 'Jelena Petrović' })).toBeVisible()
  await page.getByRole('link', { name: 'Napravi plan' }).click()
  await expect(page).toHaveURL(/\/plan$/)

  // pošalji bez plana: server odbija
  await page.getByRole('button', { name: 'Pošalji plan' }).click()
  await expect(page.getByRole('alert').filter({ hasText: /nema obroke/ })).toBeVisible()

  // šablon ishrane kopira 14 dana
  await page
    .getByLabel('Šablon ishrane')
    .selectOption({ label: 'Insulinska rezistencija · 14 dana' })
  await page.getByRole('button', { name: 'Primeni šablon' }).click()
  await expect(page.getByRole('button', { name: 'Dan 14' })).toBeVisible()

  // izmena obroka: grami se odbijaju, običan tekst prolazi
  const lunch = page
    .getByRole('listitem')
    .filter({ has: page.getByLabel('Vreme: Ručak') })
    .first()
  const lunchTitle = lunch.getByLabel('Obrok: Ručak')
  await lunchTitle.fill('Ćuretina 150 g')
  await lunch.getByRole('button', { name: 'Sačuvaj' }).click()
  await expect(lunch.getByRole('alert')).toContainText('Bez grama')
  await lunchTitle.fill('Ćuretina, heljda i salata')
  await lunch.getByRole('button', { name: 'Sačuvaj' }).click()
  await expect(lunch.getByText('Sačuvano')).toBeVisible()

  // suplement i nivo vežbi
  await page.getByLabel('Naziv suplementa').fill('Selen')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByText('Selen')).toBeVisible()
  await page.getByRole('radio', { name: 'Početni' }).click()
  await expect(page.getByRole('radio', { name: 'Početni' })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: 'Pošalji plan' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Plan je poslat' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Plan je poslat' })).toBeDisabled()

  // klijentkinja vidi da je plan spreman
  const context = await browser.newContext()
  const client = await context.newPage()
  await login(client, 'jelena')
  await expect(client).toHaveURL(/\/app\/(dan-1|priprema)$/)
  await context.close()
})

test('klijent ne ulazi u konzolu tima', async ({ page }) => {
  await login(page, 'ana')
  await page.goto('/tim/klijenti')
  await expect(page).toHaveURL(/\/app/)
})
