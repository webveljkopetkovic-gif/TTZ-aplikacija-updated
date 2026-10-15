/**
 * Faza 3: izrada plana. apply_meal_template (SQL funkcija), pravila domena i Edge Function publish-plan.
 * Traži pokrenut Supabase, seed i `npx supabase functions serve`. Koristi seed klijenta Jelenu (dan 0),
 * a na kraju vraća njen program u početno stanje.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clientFor, IDS, withDb, type TtzClient } from './helpers'

const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''

let olgica: TtzClient
let jelena: TtzClient
let templateId: string

async function publish(token: string | null, programId: string = IDS.programJelena) {
  const res = await fetch(`${URL_BASE}/functions/v1/publish-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token ?? ANON}` },
    body: JSON.stringify({ program_id: programId }),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json().catch(() => null)) as Record<string, any> | null
  return { status: res.status, data }
}

const tokenOf = async (client: TtzClient) => (await client.auth.getSession()).data.session!.access_token

async function resetJelena() {
  await withDb(async (db) => {
    await db.query(`delete from notifications where client_id = $1`, [IDS.jelena])
    await db.query(`delete from program_meals where program_id = $1`, [IDS.programJelena])
    await db.query(
      `update programs set status = 'building_plan', plan_ready_at = null, meal_template_id = null,
              exercise_level = null, training_weekdays = '{1,3,5}' where id = $1`,
      [IDS.programJelena],
    )
  })
}

beforeAll(async () => {
  ;[olgica, jelena] = await Promise.all([clientFor('olgica'), clientFor('jelena')])
  await resetJelena()
  const { data } = await olgica.from('meal_templates').select('id').limit(1).single()
  templateId = data!.id
})

afterAll(resetJelena)

describe('apply_meal_template', () => {
  it('klijent ne može da primeni šablon', async () => {
    const { error } = await jelena.rpc('apply_meal_template', {
      p_program_id: IDS.programJelena,
      p_template_id: templateId,
    })
    expect(error?.code).toBe('42501')
  })

  it('ne radi nad aktivnim programom', async () => {
    const { error } = await olgica.rpc('apply_meal_template', {
      p_program_id: IDS.programAna,
      p_template_id: templateId,
    })
    expect(error?.code).toBe('22023')
  })

  it('kopira 14 dana × 5 obroka u krug 1 i pamti šablon, i drugi poziv daje isti broj', async () => {
    const first = await olgica.rpc('apply_meal_template', {
      p_program_id: IDS.programJelena,
      p_template_id: templateId,
    })
    expect(first.error).toBeNull()
    expect(first.data).toBe(70)

    const second = await olgica.rpc('apply_meal_template', {
      p_program_id: IDS.programJelena,
      p_template_id: templateId,
    })
    expect(second.data).toBe(70)

    const { data: meals } = await olgica
      .from('program_meals')
      .select('plan_day, valid_from_cycle')
      .eq('program_id', IDS.programJelena)
    expect(meals).toHaveLength(70)
    expect(meals!.every((m) => m.valid_from_cycle === 1)).toBe(true)

    const { data: program } = await olgica.from('programs').select('meal_template_id').eq('id', IDS.programJelena).single()
    expect(program!.meal_template_id).toBe(templateId)
  })
})

describe('publish-plan', () => {
  it('traži prijavu i ulogu tima', async () => {
    expect((await publish(null)).status).toBe(401)
    expect((await publish(await tokenOf(jelena))).status).toBe(403)
  })

  it('ne šalje plan sa obrokom koji ima grame ili kalorije', async () => {
    await olgica
      .from('program_meals')
      .update({ title: 'Piletina 150 g' })
      .eq('program_id', IDS.programJelena)
      .eq('plan_day', 3)
      .eq('slot', 'lunch')
    const result = await publish(await tokenOf(olgica))
    expect(result.status).toBe(422)
    expect(result.data?.error).toContain('Bez grama')
    await olgica
      .from('program_meals')
      .update({ title: 'Piletina i povrće' })
      .eq('program_id', IDS.programJelena)
      .eq('plan_day', 3)
      .eq('slot', 'lunch')
  })

  it('za plan sa vežbama traži nivo', async () => {
    const result = await publish(await tokenOf(olgica))
    expect(result.status).toBe(422)
    expect(result.data?.error).toContain('nivo vežbi')
  })

  it('šalje plan jednom: status ready, plan_ready_at i po jedna poruka po kanalu', async () => {
    await olgica.from('programs').update({ exercise_level: 'beginner' }).eq('id', IDS.programJelena)

    const first = await publish(await tokenOf(olgica))
    expect(first.status).toBe(200)
    expect(first.data?.already_published).toBe(false)

    const again = await publish(await tokenOf(olgica))
    expect(again.status).toBe(200)
    expect(again.data?.already_published).toBe(true)

    await withDb(async (db) => {
      const { rows: program } = await db.query(`select status, plan_ready_at from programs where id = $1`, [
        IDS.programJelena,
      ])
      expect(program[0].status).toBe('ready')
      expect(program[0].plan_ready_at).not.toBeNull()

      const { rows } = await db.query(
        `select channel, kind, status from notifications where client_id = $1 and kind = 'plan_ready' order by channel`,
        [IDS.jelena],
      )
      expect(rows.map((r) => r.channel).sort()).toEqual(['email', 'whatsapp'])
      expect(rows.every((r) => r.status === 'queued')).toBe(true)
    })
  })

  it('ne šalje plan kome je već poslat ili je aktivan', async () => {
    const active = await publish(await tokenOf(olgica), IDS.programAna)
    expect(active.status).toBe(409)
  })
})
