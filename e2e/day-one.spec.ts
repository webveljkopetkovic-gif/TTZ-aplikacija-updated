/**
 * Dan 1 i svakodnevni rad: plan je spreman (seed Jelena, plan iz šablona), klijentkinja prolazi „Krećemo!“,
 * stiže na Početnu, štiklira obrok i otvara plan ishrane. Traži: `supabase start` + `functions serve` + seed.
 */
import { expect, test, type Page } from '@playwright/test'
import pg from 'pg'

const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const JELENA_PROGRAM = '00000000-0000-0000-0000-0000000000f1'

async function withDb<T>(fn: (db: pg.Client) => Promise<T>) {
  const db = new pg.Client({ connectionString: DB_URL })
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}

async function resetJelena() {
  await withDb(async (db) => {
    await db.query(`delete from feedbacks where program_id = $1`, [JELENA_PROGRAM])
    await db.query(`delete from meal_logs where program_id = $1`, [JELENA_PROGRAM])
    await db.query(`delete from measurements where program_id = $1`, [JELENA_PROGRAM])
    await db.query(`delete from program_meals where program_id = $1`, [JELENA_PROGRAM])
    await db.query(
      `update programs set status = 'building_plan', activated_at = null, plan_ready_at = null,
              exercise_level = null where id = $1`,
      [JELENA_PROGRAM],
    )
  })
}

async function readyPlan() {
  await withDb(async (db) => {
    await db.query(
      `insert into program_meals (program_id, plan_day, slot, time_of_day, title, valid_from_cycle)
       select $1, plan_day, slot, time_of_day, title, 1 from meal_template_items
        where template_id = (select id from meal_templates limit 1)`,
      [JELENA_PROGRAM],
    )
    await db.query(
      `update programs set status = 'ready', plan_ready_at = now(), exercise_level = 'beginner' where id = $1`,
      [JELENA_PROGRAM],
    )
  })
}

async function login(page: Page) {
  await page.goto('/prijava')
  await page.getByLabel('Email').fill('jelena@ttz.test')
  await page.getByLabel('Lozinka', { exact: true }).fill('Ttz-dev-2026!')
  await page.getByRole('button', { name: 'Prijavi se' }).click()
}

test.beforeAll(async () => {
  await resetJelena()
  await readyPlan()
})
test.afterAll(resetJelena)

test('Dan 1: mere i podsetnici, aktivacija, Početna i plan ishrane', async ({ page }) => {
  await login(page)
  await expect(page).toHaveURL(/\/app\/dan-1$/)
  await expect(page.getByRole('heading', { name: 'Krećemo!' })).toBeVisible()

  // pogrešna težina se odbija, a ispravna prolazi
  const weight = page.getByLabel('Težina (kg)')
  await weight.fill('20')
  await page.getByRole('button', { name: 'Sačuvaj i kreni sa danom 1' }).click()
  await expect(page.getByText('Težina mora biti između 35 i 250 kg')).toBeVisible()

  await weight.fill('78,5')
  await page.getByLabel('Obim struka (cm)').fill('86')
  await page.getByRole('button', { name: 'Sačuvaj i kreni sa danom 1' }).click()

  await expect(page).toHaveURL(/\/app\/danas$/)
  await expect(page.getByText('Zdravo, Jelena!')).toBeVisible()
  await expect(page.getByText(/Dan 1 od 30/).locator('visible=true').first()).toBeVisible()
  await expect(page.getByText(/od 14 · 1\. krug/)).toBeVisible()

  // štikliranje obroka ostaje i posle osvežavanja
  const breakfast = page.getByRole('button', { name: /^Doručak:/ })
  await expect(breakfast).toHaveAttribute('aria-pressed', 'false')
  await breakfast.click()
  await expect(breakfast).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: /^Doručak:/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // plan ishrane i tok programa
  await page.goto('/app/ishrana')
  await expect(page.getByText('Bez brojanja kalorija i vaganja namirnica')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dan 1 (danas)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.goto('/app/tok')
  await expect(
    page.getByRole('list', { name: 'Kalendar programa' }).getByRole('listitem'),
  ).toHaveCount(30)

  // aktivan program više ne vraća na Dan 1
  await page.goto('/app/dan-1')
  await expect(page).toHaveURL(/\/app\/danas$/)
})
