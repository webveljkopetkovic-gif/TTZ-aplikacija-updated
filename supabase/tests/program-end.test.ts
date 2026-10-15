/**
 * Faza 7: rezultati programa, završni izveštaj (PDF) i nastavak. Traži pokrenut Supabase, seed i
 * `npx supabase functions serve`. Koristi seed klijenta Ivanu (aktivan program) i vraća je u početno stanje.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clientFor, IDS, withDb, type TtzClient } from './helpers'

const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

let ivana: TtzClient
let ana: TtzClient
let olgica: TtzClient
let admin: TtzClient
let originalActivatedAt: string

async function call(name: string, token: string | null, body: unknown) {
  const res = await fetch(`${URL_BASE}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
    },
    body: JSON.stringify(body),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json().catch(() => null)) as Record<string, any> | null
  return { status: res.status, data }
}

const tokenOf = async (client: TtzClient) =>
  (await client.auth.getSession()).data.session!.access_token

async function cleanup() {
  await withDb(async (db) => {
    await db.query(`delete from programs where previous_program_id = $1`, [IDS.programIvana])
    await db.query(`delete from program_reports where program_id = $1`, [IDS.programIvana])
    await db.query(`delete from notifications where client_id = $1 and kind = 'report_ready'`, [
      IDS.ivana,
    ])
    await db.query(`delete from meal_logs where program_id = $1`, [IDS.programIvana])
    await db.query(`delete from workout_logs where program_id = $1`, [IDS.programIvana])
    await db.query(
      `update programs set status = 'active', ended_at = null, activated_at = $2 where id = $1`,
      [IDS.programIvana, originalActivatedAt],
    )
  })
  const service = createClient(URL_BASE, SERVICE, { auth: { persistSession: false } })
  await service.storage.from('reports').remove([`${IDS.ivana}/${IDS.programIvana}.pdf`])
}

beforeAll(async () => {
  ;[ivana, ana, olgica, admin] = await Promise.all([
    clientFor('ivana'),
    clientFor('ana'),
    clientFor('olgica'),
    clientFor('admin'),
  ])
  originalActivatedAt = await withDb(async (db) => {
    const { rows } = await db.query(
      `select to_char(activated_at, 'YYYY-MM-DD') as d from programs where id = $1`,
      [IDS.programIvana],
    )
    return rows[0].d as string
  })
  await cleanup()
})
afterAll(cleanup)

describe('program_results', () => {
  it('razlika mera, dani praćenja plana, treninzi i feedbacki', async () => {
    await withDb(async (db) => {
      // 5 obroka dnevno u planu: dan se računa kad je štikliran bar pola (3). Dani 1 i 2 da, dan 3 ne.
      const slots = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']
      for (const [day, count] of [
        [1, 5],
        [2, 3],
        [3, 2],
      ] as const) {
        for (const slot of slots.slice(0, count)) {
          await db.query(
            `insert into meal_logs (program_id, program_day, slot) values ($1, $2, $3::meal_slot)`,
            [IDS.programIvana, day, slot],
          )
        }
      }
      const { rows } = await db.query(`select id from workouts limit 2`)
      for (const w of rows) {
        await db.query(
          `insert into workout_logs (program_id, workout_id, program_day, duration_min) values ($1, $2, 3, 30)`,
          [IDS.programIvana, w.id],
        )
      }
    })

    const { data, error } = await ivana.rpc('program_results', { p_program_id: IDS.programIvana })
    expect(error).toBeNull()
    const r = data as Record<string, number>
    expect(r.start_weight_kg).toBe(81.5)
    expect(r.end_weight_kg).toBe(80.2) // poslednje merenje posle dana 1
    expect(r.start_waist_cm).toBe(90)
    expect(r.end_waist_cm).toBe(88.5)
    expect(r.followed_days).toBe(2)
    expect(r.workouts_done).toBe(2)
    expect(r.feedbacks_done).toBe(1) // seed: feedback dana 10 je odgovoren
    expect(r.full_cycles).toBe(2)
    expect(r.duration_days).toBe(30)
  })

  it('tuđ program se ne vidi', async () => {
    const { data } = await ana.rpc('program_results', { p_program_id: IDS.programIvana })
    expect(data).toBeNull()
  })
})

describe('publish-report', () => {
  const body = {
    program_id: IDS.programIvana,
    nutrition_note: 'Večernja glad je nestala, energija ujutru je bolja. Predlažem još 30 dana.',
    training_note: 'Spremna si za srednji nivo vežbi. Čučanj uz štangu.',
    recommendation: 'continue',
  }

  it('objavljuje samo tim', async () => {
    expect((await call('publish-report', null, body)).status).toBe(401)
    expect((await call('publish-report', await tokenOf(ivana), body)).status).toBe(403)
  })

  it('odbija grame i kalorije u tekstu', async () => {
    const r = await call('publish-report', await tokenOf(olgica), {
      ...body,
      nutrition_note: 'Jedi 150 g piletine.',
    })
    expect(r.status).toBe(400)
  })

  it('nacrt (bez objave) klijent ne vidi', async () => {
    const { error } = await olgica
      .from('program_reports')
      .insert({ program_id: IDS.programIvana, nutrition_note: 'nacrt' })
    expect(error).toBeNull()
    const { data } = await ivana.from('program_reports').select('id').eq('program_id', IDS.programIvana)
    expect(data ?? []).toHaveLength(0)
  })

  it('objava pravi PDF, klijent vidi izveštaj, a poruka ide jednom', async () => {
    const r = await call('publish-report', await tokenOf(olgica), body)
    expect(r.status).toBe(200)
    expect(r.data?.first_publish).toBe(true)

    const { data: report } = await ivana
      .from('program_reports')
      .select('nutrition_note, training_note, recommendation, pdf_path, published_at, results')
      .eq('program_id', IDS.programIvana)
      .single()
    expect(report?.published_at).not.toBeNull()
    expect(report?.recommendation).toBe('continue')
    expect(report?.pdf_path).toBe(`${IDS.ivana}/${IDS.programIvana}.pdf`)

    // klijent preuzima svoj PDF, tuđi klijent ne može
    const own = await ivana.storage.from('reports').download(report!.pdf_path!)
    expect(own.error).toBeNull()
    const bytes = new Uint8Array(await own.data!.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(5000)
    const foreign = await ana.storage.from('reports').download(report!.pdf_path!)
    expect(foreign.error).not.toBeNull()

    const { data: other } = await ana.from('program_reports').select('id').eq('program_id', IDS.programIvana)
    expect(other ?? []).toHaveLength(0)

    await withDb(async (db) => {
      const { rows } = await db.query(
        `select channel from notifications where client_id = $1 and kind = 'report_ready'`,
        [IDS.ivana],
      )
      expect(rows.map((n) => n.channel).sort()).toEqual(['email', 'whatsapp']) // kanali iz profila
    })
  })

  it('ponovna objava osvežava izveštaj, ali ne šalje novu poruku', async () => {
    const r = await call('publish-report', await tokenOf(olgica), {
      ...body,
      nutrition_note: 'Ispravljen tekst izveštaja.',
    })
    expect(r.status).toBe(200)
    expect(r.data?.first_publish).toBe(false)
    const { data } = await ivana
      .from('program_reports')
      .select('nutrition_note')
      .eq('program_id', IDS.programIvana)
      .single()
    expect(data?.nutrition_note).toBe('Ispravljen tekst izveštaja.')
    await withDb(async (db) => {
      const { rows } = await db.query(
        `select count(*)::int as n from notifications where client_id = $1 and kind = 'report_ready'`,
        [IDS.ivana],
      )
      expect(rows[0].n).toBe(2) // isti dedupe ključevi: nema novih poruka
    })
  })
})

describe('renew-program', () => {
  it('traži prijavu, a tuđ program je „nije pronađen“', async () => {
    const body = { program_id: IDS.programIvana, option: 'continue' }
    expect((await call('renew-program', null, body)).status).toBe(401)
    expect((await call('renew-program', await tokenOf(ana), body)).status).toBe(404)
  })

  it('pre dana 28 ponuda još nije otvorena', async () => {
    const r = await call('renew-program', await tokenOf(ivana), {
      program_id: IDS.programIvana,
      option: 'continue',
    })
    expect(r.status).toBe(409)
  })

  it('„Samo ishrana“: novi program čeka uplatu, sa kopiranim poslednjim obrocima i suplementima', async () => {
    await withDb((db) =>
      // dan 29 programa
      db.query(
        `update programs set activated_at = (now() at time zone 'Europe/Belgrade')::date - 28 where id = $1`,
        [IDS.programIvana],
      ),
    )
    const r = await call('renew-program', await tokenOf(ivana), {
      program_id: IDS.programIvana,
      option: 'nutrition_only',
    })
    expect(r.status).toBe(200)
    expect(r.data?.existing).toBe(false)
    expect(r.data?.amount_rsd).toBe(7900)

    await withDb(async (db) => {
      const { rows: program } = await db.query(
        `select status, previous_program_id, exercise_level, plan_focus, p.kind
           from programs g join products p on p.id = g.product_id where g.id = $1`,
        [r.data!.program_id],
      )
      expect(program[0]).toMatchObject({
        status: 'awaiting_payment',
        previous_program_id: IDS.programIvana,
        exercise_level: null,
        plan_focus: 'Štitna žlezda',
        kind: 'nutrition',
      })
      const { rows: meals } = await db.query(
        `select count(*)::int as n, bool_and(valid_from_cycle = 1) as all_first from program_meals where program_id = $1`,
        [r.data!.program_id],
      )
      expect(meals[0]).toEqual({ n: 70, all_first: true })
      // izmena iz 2. kruga (plan dan 6, ručak) je postala osnova novog plana
      const { rows: lunch } = await db.query(
        `select title from program_meals where program_id = $1 and plan_day = 6 and slot = 'lunch'`,
        [r.data!.program_id],
      )
      expect(lunch[0].title).toBe('Ćuretina umesto piletine, manje začina')
      const { rows: supplements } = await db.query(
        `select count(*)::int as n from supplements where program_id = $1`,
        [r.data!.program_id],
      )
      expect(supplements[0].n).toBe(3)
      const { rows: payment } = await db.query(
        `select amount_rsd, status from payments where program_id = $1`,
        [r.data!.program_id],
      )
      expect(payment[0]).toEqual({ amount_rsd: 7900, status: 'pending' })
    })
  })

  it('ponovljen poziv vraća isti program bez duplikata', async () => {
    const again = await call('renew-program', await tokenOf(ivana), {
      program_id: IDS.programIvana,
      option: 'continue',
    })
    expect(again.status).toBe(200)
    expect(again.data?.existing).toBe(true)
    await withDb(async (db) => {
      const { rows } = await db.query(
        `select count(*)::int as n from programs where previous_program_id = $1`,
        [IDS.programIvana],
      )
      expect(rows[0].n).toBe(1)
    })
  })

  it('uplata nastavka: novi program ulazi u dan 0, a prethodni postaje „produžen“', async () => {
    const { rows } = await withDb((db) =>
      db.query(
        `select pay.id from payments pay join programs g on g.id = pay.program_id where g.previous_program_id = $1`,
        [IDS.programIvana],
      ),
    )
    const confirm = await call('confirm-payment', await tokenOf(admin), { payment_id: rows[0].id })
    expect(confirm.status).toBe(200)
    await withDb(async (db) => {
      const { rows: next } = await db.query(
        `select status from programs where previous_program_id = $1`,
        [IDS.programIvana],
      )
      expect(next[0].status).toBe('building_plan')
      const { rows: previous } = await db.query(`select status from programs where id = $1`, [
        IDS.programIvana,
      ])
      expect(previous[0].status).toBe('renewed')
    })
  })
})
