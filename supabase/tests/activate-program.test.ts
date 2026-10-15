/**
 * Faza 4: activate-program (Dan 1) i klijentski upisi (obroci, merenja). Traži pokrenut Supabase, seed i
 * `npx supabase functions serve`. Koristi seed klijenta Jelenu (dan 0) i vraća je u početno stanje.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clientFor, IDS, withDb, type TtzClient } from './helpers'

const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''

let jelena: TtzClient
let ana: TtzClient

async function activate(token: string | null, programId: string) {
  const res = await fetch(`${URL_BASE}/functions/v1/activate-program`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
    },
    body: JSON.stringify({ program_id: programId }),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json().catch(() => null)) as Record<string, any> | null
  return { status: res.status, data }
}

const tokenOf = async (client: TtzClient) =>
  (await client.auth.getSession()).data.session!.access_token

const belgradeToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date())

async function resetJelena() {
  await withDb(async (db) => {
    await db.query(`delete from feedbacks where program_id = $1`, [IDS.programJelena])
    await db.query(`delete from meal_logs where program_id = $1`, [IDS.programJelena])
    await db.query(`delete from measurements where program_id = $1`, [IDS.programJelena])
    await db.query(
      `update programs set status = 'building_plan', activated_at = null, plan_ready_at = null where id = $1`,
      [IDS.programJelena],
    )
  })
}

beforeAll(async () => {
  ;[jelena, ana] = await Promise.all([clientFor('jelena'), clientFor('ana')])
  await resetJelena()
})

afterAll(resetJelena)

describe('activate-program', () => {
  it('traži prijavu, a tuđ program je „nije pronađen“', async () => {
    expect((await activate(null, IDS.programJelena)).status).toBe(401)
    expect((await activate(await tokenOf(ana), IDS.programJelena)).status).toBe(404)
  })

  it('ne aktivira program dok plan nije spreman', async () => {
    const result = await activate(await tokenOf(jelena), IDS.programJelena)
    expect(result.status).toBe(409)
  })

  it('Dan 1 je danas po Beogradu, status active i feedbacki za dane 10, 20 i 30', async () => {
    await withDb((db) =>
      db.query(`update programs set status = 'ready', plan_ready_at = now() where id = $1`, [
        IDS.programJelena,
      ]),
    )
    const result = await activate(await tokenOf(jelena), IDS.programJelena)
    expect(result.status).toBe(200)
    expect(result.data?.already_active).toBe(false)
    expect(result.data?.activated_at).toBe(belgradeToday())

    await withDb(async (db) => {
      const { rows: program } = await db.query(
        `select status, to_char(activated_at, 'YYYY-MM-DD') as activated_at from programs where id = $1`,
        [IDS.programJelena],
      )
      expect(program[0]).toEqual({ status: 'active', activated_at: belgradeToday() })

      const { rows } = await db.query(
        `select due_day, to_char(due_date, 'YYYY-MM-DD') as due_date, status
           from feedbacks where program_id = $1 order by due_day`,
        [IDS.programJelena],
      )
      expect(rows.map((r) => r.due_day)).toEqual([10, 20, 30])
      expect(rows.every((r) => r.status === 'scheduled')).toBe(true)
      const { rows: expected } = await db.query(
        `select to_char($1::date + 9, 'YYYY-MM-DD') as d10, to_char($1::date + 29, 'YYYY-MM-DD') as d30`,
        [belgradeToday()],
      )
      expect(rows[0].due_date).toBe(expected[0].d10)
      expect(rows[2].due_date).toBe(expected[0].d30)
    })
  })

  it('ponovljen poziv ne menja datum i ne pravi duple feedbacke', async () => {
    await withDb((db) =>
      db.query(`update programs set activated_at = activated_at - 1 where id = $1`, [IDS.programJelena]),
    )
    const again = await activate(await tokenOf(jelena), IDS.programJelena)
    expect(again.status).toBe(200)
    expect(again.data?.already_active).toBe(true)
    await withDb(async (db) => {
      const { rows } = await db.query(
        `select count(*)::int as n from feedbacks where program_id = $1`,
        [IDS.programJelena],
      )
      expect(rows[0].n).toBe(3)
      const { rows: p } = await db.query(
        `select (activated_at = (now() at time zone 'Europe/Belgrade')::date - 1) as unchanged
           from programs where id = $1`,
        [IDS.programJelena],
      )
      expect(p[0].unchanged).toBe(true)
    })
  })
})

describe('klijentski upisi (RLS)', () => {
  it('klijent štiklira obrok i upisuje merenje na svom programu, ali ne na tuđem', async () => {
    const own = await jelena
      .from('meal_logs')
      .upsert(
        { program_id: IDS.programJelena, program_day: 1, slot: 'breakfast' },
        { onConflict: 'program_id,program_day,slot' },
      )
    expect(own.error).toBeNull()

    const measurement = await jelena
      .from('measurements')
      .upsert(
        { program_id: IDS.programJelena, program_day: 1, weight_kg: 78, waist_cm: 86 },
        { onConflict: 'program_id,program_day' },
      )
    expect(measurement.error).toBeNull()

    const foreign = await jelena
      .from('meal_logs')
      .insert({ program_id: IDS.programAna, program_day: 1, slot: 'breakfast' })
    expect(foreign.error).not.toBeNull()
  })

  it('klijent ne može sam da menja status programa', async () => {
    const { data } = await jelena
      .from('programs')
      .update({ status: 'ended' })
      .eq('id', IDS.programJelena)
      .select('id')
    expect(data ?? []).toHaveLength(0)
  })
})
