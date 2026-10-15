/**
 * Faza 5: scheduler sa lažnim vremenom, dedupe poruka, slanje feedbacka, odgovor tima i fallback na email.
 * Traži pokrenut Supabase, seed i `npx supabase functions serve` (lokalno sa NOTIFY_DRY_RUN=true, bez pravih poruka).
 * Koristi seed klijenta Jelenu (aktivira joj program 5. 10. 2026) i vraća je u početno stanje.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { feedbackSchedule } from '../../src/lib/schedule'
import { clientFor, IDS, withDb, type TtzClient } from './helpers'

const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const ACTIVATED = '2026-10-05' // dan 10 = 14. 10. 2026, otvaranje u 09:00 po Beogradu = 07:00 UTC
const T_0859 = '2026-10-14T06:59:00Z'
const T_0900 = '2026-10-14T07:00:00Z'
const T_24H = '2026-10-15T07:00:00Z'
const T_48H = '2026-10-16T07:00:00Z'

let jelena: TtzClient
let ana: TtzClient
let olgica: TtzClient

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

const tick = (now: string) =>
  call('scheduler', SERVICE, { now, program_id: IDS.programJelena })

async function reset() {
  await withDb(async (db) => {
    await db.query(`delete from notifications where client_id = $1`, [IDS.jelena])
    await db.query(`delete from feedbacks where program_id = $1`, [IDS.programJelena])
    await db.query(`delete from measurements where program_id = $1`, [IDS.programJelena])
    await db.query(`update profiles set phone = '+38163100100' where id = $1`, [IDS.jelena])
    await db.query(
      `update programs set status = 'building_plan', activated_at = null, plan_ready_at = null where id = $1`,
      [IDS.programJelena],
    )
  })
}

async function activate() {
  await reset()
  await withDb(async (db) => {
    await db.query(
      `update programs set status = 'active', activated_at = $2, plan_ready_at = now() where id = $1`,
      [IDS.programJelena, ACTIVATED],
    )
    for (const f of feedbackSchedule(ACTIVATED, 30)) {
      await db.query(
        `insert into feedbacks (program_id, due_day, due_date) values ($1, $2, $3)`,
        [IDS.programJelena, f.due_day, f.due_date],
      )
    }
  })
}

const feedback10 = () =>
  withDb(async (db) => {
    const { rows } = await db.query(
      `select id, status, reminder_count from feedbacks where program_id = $1 and due_day = 10`,
      [IDS.programJelena],
    )
    return rows[0] as { id: string; status: string; reminder_count: number }
  })

const notifications = (kind: string) =>
  withDb(async (db) => {
    const { rows } = await db.query(
      `select channel, status, dedupe_key from notifications where client_id = $1 and kind = $2 order by dedupe_key`,
      [IDS.jelena, kind],
    )
    return rows as { channel: string; status: string; dedupe_key: string }[]
  })

const answers = (over: Record<string, unknown> = {}) => ({
  general: 4,
  energy_am: 2,
  food_tags: ['heartburn'],
  food_text: 'Posle paradajza u salati',
  exercise_tags: ['pain_knee'],
  exercise_text: '',
  challenges: 'Uveče sam jako gladna',
  weight_kg: 68.4,
  waist_cm: 82,
  reply_channels: ['whatsapp', 'email'],
  ...over,
})

beforeAll(async () => {
  ;[jelena, ana, olgica] = await Promise.all([
    clientFor('jelena'),
    clientFor('ana'),
    clientFor('olgica'),
  ])
  await activate()
})
afterAll(reset)

describe('scheduler: dan 10 sa lažnim vremenom', () => {
  it('prima samo service role ključ', async () => {
    expect((await call('scheduler', null, {})).status).toBe(403)
    expect((await call('scheduler', await tokenOf(olgica), {})).status).toBe(403)
  })

  it('u 08:59 ne otvara feedback i ne šalje ništa', async () => {
    const r = await tick(T_0859)
    expect(r.status).toBe(200)
    expect(r.data?.opened).toBe(0)
    expect((await feedback10()).status).toBe('scheduled')
    expect(await notifications('feedback_due')).toHaveLength(0)
  })

  it('u 09:00 otvara feedback i pravi po jednu poruku po kanalu (WhatsApp + email)', async () => {
    const r = await tick(T_0900)
    expect(r.data?.opened).toBe(1)
    expect((await feedback10()).status).toBe('open')
    const rows = await notifications('feedback_due')
    expect(rows.map((n) => n.channel).sort()).toEqual(['email', 'whatsapp'])
    expect(rows.every((n) => n.status === 'sent')).toBe(true)
  })

  it('ponovljen i istovremen poziv ne prave duple poruke', async () => {
    const results = await Promise.all([tick(T_0900), tick(T_0900), tick(T_0900)])
    expect(results.reduce((n, r) => n + (r.data?.opened ?? 0), 0)).toBe(0)
    expect(await notifications('feedback_due')).toHaveLength(2)
  })

  it('posle 24 h šalje tačno jedan podsetnik', async () => {
    const [a, b] = await Promise.all([tick(T_24H), tick(T_24H)])
    expect((a.data?.reminded ?? 0) + (b.data?.reminded ?? 0)).toBe(1)
    await tick(T_24H)
    expect((await feedback10()).reminder_count).toBe(1)
    const rows = await notifications('feedback_reminder')
    expect(rows.map((n) => n.dedupe_key.split(':').slice(2).join(':')).sort()).toEqual([
      'r1:email',
      'r1:whatsapp',
    ])
  })

  it('posle 48 h feedback je „late“, bez novih poruka', async () => {
    const r = await tick(T_48H)
    expect(r.data?.late).toBe(1)
    expect((await feedback10()).status).toBe('late')
    expect(await notifications('feedback_reminder')).toHaveLength(2)
    expect((await tick(T_48H)).data?.late).toBe(0)
  })
})

describe('submit-feedback', () => {
  it('traži prijavu, a tuđ feedback je „nije pronađen“', async () => {
    const { id } = await feedback10()
    expect((await call('submit-feedback', null, { feedback_id: id, answers: answers() })).status).toBe(401)
    expect(
      (await call('submit-feedback', await tokenOf(ana), { feedback_id: id, answers: answers() })).status,
    ).toBe(404)
  })

  it('feedback koji još nije otvoren se ne može poslati', async () => {
    const { rows } = await withDb((db) =>
      db.query(`select id from feedbacks where program_id = $1 and due_day = 20`, [IDS.programJelena]),
    )
    const r = await call('submit-feedback', await tokenOf(jelena), {
      feedback_id: rows[0].id,
      answers: answers(),
    })
    expect(r.status).toBe(409)
  })

  it('neispravni odgovori se odbijaju sa poljima', async () => {
    const { id } = await feedback10()
    const r = await call('submit-feedback', await tokenOf(jelena), {
      feedback_id: id,
      answers: answers({ general: 9, weight_kg: 12 }),
    })
    expect(r.status).toBe(400)
    expect(Object.keys(r.data?.fields ?? {})).toEqual(expect.arrayContaining(['general', 'weight_kg']))
  })

  it('klijent ne može direktno da menja feedback (RLS)', async () => {
    const { id } = await feedback10()
    const { data } = await jelena.from('feedbacks').update({ status: 'answered' }).eq('id', id).select('id')
    expect(data ?? []).toHaveLength(0)
    expect((await feedback10()).status).toBe('late')
  })

  it('zakasneli feedback se šalje: status submitted i merenje za dan 10', async () => {
    const { id } = await feedback10()
    const r = await call('submit-feedback', await tokenOf(jelena), { feedback_id: id, answers: answers() })
    expect(r.status).toBe(200)
    await withDb(async (db) => {
      const { rows } = await db.query(`select status, answers from feedbacks where id = $1`, [id])
      expect(rows[0].status).toBe('submitted')
      expect(rows[0].answers.weight_kg).toBe(68.4)
      const { rows: m } = await db.query(
        `select weight_kg::float as w, waist_cm::float as c, energy_am from measurements
          where program_id = $1 and program_day = 10`,
        [IDS.programJelena],
      )
      expect(m[0]).toEqual({ w: 68.4, c: 82, energy_am: 2 })
    })
    const again = await call('submit-feedback', await tokenOf(jelena), { feedback_id: id, answers: answers() })
    expect(again.status).toBe(409)
  })
})

describe('team-reply', () => {
  it('odgovara samo tim', async () => {
    const { id } = await feedback10()
    const body = { feedback_id: id, body: 'Bravo.', channels: ['email'] }
    expect((await call('team-reply', null, body)).status).toBe(401)
    expect((await call('team-reply', await tokenOf(jelena), body)).status).toBe(403)
  })

  it('odgovor sa gramima ili kalorijama se odbija', async () => {
    const { id } = await feedback10()
    const r = await call('team-reply', await tokenOf(olgica), {
      feedback_id: id,
      body: 'Jedi 150 g piletine.',
      channels: ['email'],
    })
    expect(r.status).toBe(400)
  })

  it('odgovor se upisuje, status je answered, a poruka ide na izabrane kanale', async () => {
    const { id } = await feedback10()
    const r = await call('team-reply', await tokenOf(olgica), {
      feedback_id: id,
      body: 'Ana, paradajz izbacujemo iz ručka, umesto njega krastavac.',
      channels: ['whatsapp', 'email'],
    })
    expect(r.status).toBe(200)
    expect((await feedback10()).status).toBe('answered')
    const rows = await notifications('team_reply')
    expect(rows.map((n) => n.channel).sort()).toEqual(['email', 'whatsapp'])
    // klijent vidi odgovor u aplikaciji
    const { data } = await jelena.from('feedback_replies').select('body, sent_channels').eq('feedback_id', id)
    expect(data).toHaveLength(1)
    expect(data![0].sent_channels.sort()).toEqual(['email', 'whatsapp'])
  })
})

describe('slanje poruka', () => {
  it('WhatsApp bez broja telefona pada, a isti sadržaj ide emailom (fallback)', async () => {
    await withDb(async (db) => {
      await db.query(`update profiles set phone = null where id = $1`, [IDS.jelena])
      await db.query(
        `insert into notifications (client_id, kind, channel, template, payload, scheduled_for, dedupe_key)
         values ($1, 'feedback_due', 'whatsapp', 'ttz_feedback_due', $2, now(), 'test:fallback:whatsapp')`,
        [IDS.jelena, JSON.stringify({ due_day: 10, program_id: IDS.programJelena })],
      )
    })
    const r = await call('send-notification', SERVICE, {})
    expect(r.status).toBe(200)
    await withDb(async (db) => {
      const { rows } = await db.query(
        `select channel, status, error from notifications where dedupe_key like 'test:fallback:%' order by channel`,
      )
      const byChannel = Object.fromEntries(rows.map((n) => [n.channel, n]))
      expect(byChannel.whatsapp.status).toBe('failed')
      expect(byChannel.whatsapp.error).toMatch(/broj telefona/)
      expect(['queued', 'sent']).toContain(byChannel.email.status)
    })
  })

  it('tim vraća neuspelu poruku u red, klijent to ne može', async () => {
    const { rows } = await withDb((db) =>
      db.query(`select id from notifications where dedupe_key = 'test:fallback:whatsapp'`),
    )
    const id = rows[0].id
    expect((await call('send-notification', await tokenOf(jelena), { retry_id: id })).status).toBe(403)
    const r = await call('send-notification', await tokenOf(olgica), { retry_id: id })
    expect(r.status).toBe(200)
    // broj i dalje nedostaje, pa pada ponovo (attempts je nov)
    await withDb(async (db) => {
      const { rows: after } = await db.query(`select status from notifications where id = $1`, [id])
      expect(after[0].status).toBe('failed')
    })
  })
})

describe('kraj programa', () => {
  it('najava na dan 28 u 09:00, pa status ended posle dana 30', async () => {
    const announce = await tick('2026-11-01T08:00:00Z')
    expect(announce.data?.announced).toBe(1)
    expect((await notifications('program_end')).length).toBeGreaterThan(0)
    await tick('2026-11-01T08:00:00Z')
    const channelsCount = (await notifications('program_end')).length
    expect(channelsCount).toBe(2)

    const end = await tick('2026-11-03T23:00:00Z')
    expect(end.data?.ended).toBe(1)
    const { rows } = await withDb((db) =>
      db.query(`select status from programs where id = $1`, [IDS.programJelena]),
    )
    expect(rows[0].status).toBe('ended')
  })
})
