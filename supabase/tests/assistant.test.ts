/**
 * Faza 6: AI asistent preko Edge Function `assistant` i odluka tima (review_assistant_proposal).
 * Traži pokrenut Supabase, seed i `npx supabase functions serve` sa AI_DRY_RUN=true (lažni model, bez API ključa).
 * Ana je seed klijent na Danu 1 (plan dan 1, krug 1). Test vraća njene poruke i plan u početno stanje.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clientFor, IDS, withDb, type TtzClient } from './helpers'

const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const SEED_LUNCH_DAY_1 = 'Ćuretina, heljda, salata'

let ana: TtzClient
let ivana: TtzClient
let jelena: TtzClient
let olgica: TtzClient
let veljko: TtzClient
let startedAt: string

const tokenOf = async (client: TtzClient) =>
  (await client.auth.getSession()).data.session!.access_token

async function ask(client: TtzClient, body: unknown) {
  const res = await fetch(`${URL_BASE}/functions/v1/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      Authorization: `Bearer ${await tokenOf(client)}`,
    },
    body: JSON.stringify(body),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json().catch(() => null)) as Record<string, any> | null
  return { status: res.status, data }
}

async function cleanup() {
  await withDb(async (db) => {
    await db.query(`delete from ai_usage where created_at >= $1`, [startedAt])
    await db.query(`delete from messages where created_at >= $1 and client_id in ($2, $3)`, [
      startedAt,
      IDS.ana,
      IDS.ivana,
    ])
    await db.query(
      `delete from program_meals where program_id = $1 and valid_from_cycle > 1`,
      [IDS.programAna],
    )
    await db.query(
      `update program_meals set title = $2 where program_id = $1 and plan_day = 1 and slot = 'lunch' and valid_from_cycle = 1`,
      [IDS.programAna, SEED_LUNCH_DAY_1],
    )
  })
}

beforeAll(async () => {
  ;[ana, ivana, jelena, olgica, veljko] = await Promise.all([
    clientFor('ana'),
    clientFor('ivana'),
    clientFor('jelena'),
    clientFor('olgica'),
    clientFor('veljko'),
  ])
  startedAt = await withDb(async (db) => (await db.query(`select now() as t`)).rows[0].t.toISOString())
})
afterAll(cleanup)

describe('assistant: ko sme da pita', () => {
  it('klijent bez aktivnog programa dobija 409, tim 403', async () => {
    expect((await ask(jelena, { body: 'Mogu li kafu?' })).status).toBe(409)
    expect((await ask(olgica, { body: 'Mogu li kafu?' })).status).toBe(403)
  })

  it('prazno pitanje je 400', async () => {
    expect((await ask(ana, { body: '  ' })).status).toBe(400)
  })

  it('klijent više ne upisuje poruke direktno (samo kroz funkciju)', async () => {
    const insert = await ana
      .from('messages')
      .insert({ client_id: IDS.ana, sender: 'client', body: 'zaobilazim limit' })
    expect(insert.error).not.toBeNull()
  })
})

describe('assistant: odgovor i predlog', () => {
  let proposalId: string

  it('„ne volim“ pravi predlog zamene obroka koji čeka tim', async () => {
    const r = await ask(ana, { body: 'Ne volim ručak danas, može zamena?' })
    expect(r.status).toBe(200)
    const [question, reply] = r.data!.messages
    expect(question.sender).toBe('client')
    expect(reply.sender).toBe('assistant')
    expect(reply.needs_team_review).toBe(true)
    expect(reply.proposed_action).toMatchObject({ type: 'meal_swap', plan_day: 1, slot: 'lunch' })
    expect(typeof r.data!.remaining).toBe('number')
    proposalId = reply.id

    // plan se ne menja dok tim ne potvrdi
    const { data: meals } = await ana
      .from('program_meals')
      .select('title')
      .eq('program_id', IDS.programAna)
      .eq('plan_day', 1)
      .eq('slot', 'lunch')
    expect(meals?.map((m) => m.title)).toEqual([SEED_LUNCH_DAY_1])
  })

  it('beleži tokene, a klijent ih ne vidi', async () => {
    const rows = await withDb(async (db) =>
      (await db.query(`select outcome, calls from ai_usage where message_id = $1`, [proposalId])).rows,
    )
    expect(rows).toEqual([{ outcome: 'ok', calls: 2 }])
    const { data } = await ana.from('ai_usage').select('id')
    expect(data ?? []).toEqual([])
    const partner = await veljko.from('ai_usage').select('id')
    expect(partner.data ?? []).toEqual([])
  })

  it('klijent ne može sam da odobri predlog', async () => {
    const { error } = await ana.rpc('review_assistant_proposal', {
      p_message_id: proposalId,
      p_result: 'approved',
    })
    expect(error).not.toBeNull()
  })

  it('odbija izmenu sa gramima', async () => {
    const { error } = await olgica.rpc('review_assistant_proposal', {
      p_message_id: proposalId,
      p_result: 'edited',
      p_title: 'Piletina 150 g',
    })
    expect(error).not.toBeNull()
  })

  it('Olgica izmeni i odobri: obrok se menja, klijent dobija poruku tima', async () => {
    const { data, error } = await olgica.rpc('review_assistant_proposal', {
      p_message_id: proposalId,
      p_result: 'edited',
      p_title: 'Ćuretina sa tikvicama',
      p_note: 'Menjamo ručak, prijatno!',
    })
    expect(error).toBeNull()
    expect(data).toMatchObject({ title: 'Ćuretina sa tikvicama', applied_cycle: 1 })

    const { data: meals } = await ana
      .from('program_meals')
      .select('title, valid_from_cycle')
      .eq('program_id', IDS.programAna)
      .eq('plan_day', 1)
      .eq('slot', 'lunch')
    expect(meals).toEqual([{ title: 'Ćuretina sa tikvicama', valid_from_cycle: 1 }])

    const { data: mine } = await ana
      .from('messages')
      .select('sender, body, review_result')
      .gte('created_at', startedAt)
      .order('created_at')
    expect(mine?.find((m) => m.sender === 'assistant')?.review_result).toBe('edited')
    expect(mine?.at(-1)).toMatchObject({ sender: 'team', body: 'Menjamo ručak, prijatno!' })
  })

  it('isti predlog ne može dvaput da se obradi', async () => {
    const { error } = await olgica.rpc('review_assistant_proposal', {
      p_message_id: proposalId,
      p_result: 'rejected',
    })
    expect(error).not.toBeNull()
  })

  it('ozbiljan simptom: savet za lekara i hitna eskalacija i kad model to ne uradi', async () => {
    const r = await ask(ana, { body: 'Boli me u grudima od jutros' })
    expect(r.status).toBe(200)
    const reply = r.data!.messages[1]
    expect(reply.body).toMatch(/lekar/i)
    expect(reply.proposed_action).toMatchObject({ type: 'escalation', urgency: 'high' })
    expect(reply.needs_team_review).toBe(true)
  })
})

describe('assistant: dnevni limit', () => {
  it('posle 30 pitanja danas vraća 429', async () => {
    await withDb((db) =>
      db.query(
        `insert into messages (client_id, program_id, sender, body)
         select $1, $2, 'client', 'pitanje ' || n from generate_series(1, 30) n`,
        [IDS.ivana, IDS.programIvana],
      ),
    )
    const r = await ask(ivana, { body: 'Još jedno pitanje' })
    expect(r.status).toBe(429)
  })
})
