/**
 * Kraj programa: seed klijentkinja (Ivana) je na danu 30. Vidi rezultate, Olgica objavljuje završni izveštaj,
 * klijentkinja bira „Samo ishrana“, admin potvrđuje uplatu, tim šalje plan (kopija poslednjih obroka) i
 * klijentkinja počinje novi Dan 1. Traži: `supabase start` + `functions serve` + seed (`db reset`).
 */
import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const DB_URL = process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const PASSWORD = 'Ttz-dev-2026!'
const IVANA = '00000000-0000-0000-0000-0000000000c3'
const IVANA_PROGRAM = '00000000-0000-0000-0000-0000000000f3'

// lokalni demo ključ Supabase-a (isti kao u purchase-flow.spec.ts), u produkciji ga nema
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

let originalActivatedAt = ''

async function withDb<T>(fn: (db: pg.Client) => Promise<T>) {
  const db = new pg.Client({ connectionString: DB_URL })
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}

async function cleanup() {
  const service = createClient('http://127.0.0.1:54321', SERVICE_KEY, {
    auth: { persistSession: false },
  })
  await service.storage.from('reports').remove([`${IVANA}/${IVANA_PROGRAM}.pdf`])
  await withDb(async (db) => {
    await db.query(`delete from programs where previous_program_id = $1`, [IVANA_PROGRAM])
    await db.query(`delete from program_reports where program_id = $1`, [IVANA_PROGRAM])
    await db.query(`delete from notifications where client_id = $1 and kind = 'report_ready'`, [
      IVANA,
    ])
    await db.query(`delete from notifications where client_id = $1 and kind = 'plan_ready'`, [
      IVANA,
    ])
    if (originalActivatedAt) {
      await db.query(
        `update programs set status = 'active', ended_at = null, activated_at = $2 where id = $1`,
        [IVANA_PROGRAM, originalActivatedAt],
      )
    }
  })
}

async function login(page: Page, who: string) {
  await page.goto('/prijava')
  await page.getByLabel('Email').fill(`${who}@ttz.test`)
  await page.getByLabel('Lozinka', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Prijavi se' }).click()
  await expect(page).not.toHaveURL(/\/prijava/)
}

test.beforeAll(async () => {
  originalActivatedAt = await withDb(async (db) => {
    const { rows } = await db.query(
      `select to_char(activated_at, 'YYYY-MM-DD') as d from programs where id = $1`,
      [IVANA_PROGRAM],
    )
    return rows[0].d as string
  })
  await cleanup()
  // dan 30 programa
  await withDb((db) =>
    db.query(
      `update programs set activated_at = (now() at time zone 'Europe/Belgrade')::date - 29 where id = $1`,
      [IVANA_PROGRAM],
    ),
  )
})
test.afterAll(cleanup)

test('dan 30: rezultati, izveštaj tima, nastavak, uplata i novi Dan 1', async ({
  page,
  browser,
}) => {
  // ---- klijentkinja na danu 30
  await login(page, 'ivana')
  await page.goto('/app/danas')
  await page.getByRole('link', { name: /Program je završen/ }).click()
  await expect(page).toHaveURL(/\/app\/kraj$/)
  await expect(
    page.getByRole('heading', { name: 'Bravo, Ivana! Program je završen.' }),
  ).toBeVisible()
  await expect(page.getByText('DAN 30 OD 30', { exact: false })).toBeVisible()
  await expect(page.getByText('−1,3 kg')).toBeVisible() // 81,5 → 80,2 (seed merenja)
  await expect(page.getByText('−1,5 cm')).toBeVisible()
  await expect(page.getByText(/Olgica i Ognjen pišu tvoj završni izveštaj/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preuzmi izveštaj (PDF)' })).toHaveCount(0)

  // ---- Olgica objavljuje izveštaj
  const teamContext = await browser.newContext()
  const olgica = await teamContext.newPage()
  await login(olgica, 'olgica')
  await olgica.goto(`/tim/klijenti/${IVANA}/izvestaj`)
  await expect(
    olgica.getByRole('heading', { name: /Završni izveštaj · Ivana Jović/ }),
  ).toBeVisible()

  await olgica.getByLabel('Olgicin deo izveštaja').fill('Jedi 150 g piletine.')
  await olgica.getByRole('button', { name: 'Objavi izveštaj' }).click()
  await expect(olgica.getByRole('alert').filter({ hasText: /grama|kalorij/i })).toBeVisible()

  await olgica
    .getByLabel('Olgicin deo izveštaja')
    .fill('Večernja glad je nestala, energija ujutru je bolja. Predlažem još 30 dana.')
  await olgica.getByLabel('Ognjenov deo izveštaja').fill('Spremna si za srednji nivo vežbi.')
  await olgica.getByRole('radio', { name: 'Samo ishrana' }).click()
  await olgica.getByRole('button', { name: 'Objavi izveštaj' }).click()
  await expect(
    olgica.getByRole('status').filter({ hasText: /Izveštaj je objavljen/ }),
  ).toBeVisible()
  await expect(olgica.getByRole('status').filter({ hasText: /Objavljeno/ })).toBeVisible()

  // ---- klijentkinja vidi izveštaj, a preporuka je „Samo ishrana“
  await page.reload()
  await expect(page.getByText('Večernja glad je nestala')).toBeVisible()
  await expect(page.getByText('Spremna si za srednji nivo vežbi.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preuzmi izveštaj (PDF)' })).toBeVisible()
  const nutritionOnly = page.getByRole('radio', { name: /Samo ishrana · 30 dana/ })
  await expect(nutritionOnly).toHaveAttribute('aria-checked', 'true')
  await expect(nutritionOnly).toContainText('PREPORUKA')
  await expect(nutritionOnly).toContainText('7.900 RSD')

  // ---- nastavak: novi program čeka uplatu
  await page.getByRole('button', { name: 'Nastavi program' }).click()
  await expect(page).toHaveURL(/\/app\/uplata$/)
  await expect(page.getByText('7.900 RSD').first()).toBeVisible()
  const reference = await withDb(async (db) => {
    const { rows } = await db.query(
      `select pay.provider_ref from payments pay join programs g on g.id = pay.program_id
        where g.previous_program_id = $1`,
      [IVANA_PROGRAM],
    )
    return rows[0].provider_ref as string
  })

  // ---- admin potvrđuje uplatu
  const adminContext = await browser.newContext()
  const admin = await adminContext.newPage()
  await login(admin, 'admin')
  await admin.goto('/tim/uplate')
  const row = admin.getByRole('listitem').filter({ hasText: reference })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Uplata primljena' }).click()
  await expect(row.getByText('Potvrđeno')).toBeVisible()
  await adminContext.close()
  await expect(page).toHaveURL(/\/app\/priprema$/, { timeout: 25_000 })

  // ---- tim šalje plan: poslednji obroci su već kopirani kao osnova
  await olgica.goto(`/tim/klijenti/${IVANA}/plan`)
  await olgica.getByRole('button', { name: 'Pošalji plan' }).click()
  await expect(olgica.getByRole('status').filter({ hasText: 'Plan je poslat' })).toBeVisible()
  await teamContext.close()

  // ---- novi Dan 1
  await page.goto('/app')
  await expect(page).toHaveURL(/\/app\/dan-1$/)
  await page.getByLabel('Težina (kg)').fill('79,8')
  await page.getByRole('button', { name: 'Sačuvaj i kreni sa danom 1' }).click()
  await expect(page).toHaveURL(/\/app\/danas$/)
  await expect(
    page
      .getByText(/Dan 1 od 30/)
      .locator('visible=true')
      .first(),
  ).toBeVisible()
  // izmena iz 2. kruga starog programa je osnova novog plana (plan dan 6, ručak)
  await page.goto('/app/ishrana')
  await page.getByRole('button', { name: 'Dan 6' }).click()
  await expect(page.getByText('Ćuretina umesto piletine, manje začina')).toBeVisible()
})
