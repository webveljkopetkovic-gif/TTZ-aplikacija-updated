/**
 * Testovi Edge Functions: submit-intake, upload-intake-file, create-checkout, confirm-payment, payment-webhook.
 * Traže pokrenut Supabase i `npx supabase functions serve`. Podaci koje test napravi se brišu na kraju.
 */
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, clientFor, withDb, type TtzClient } from './helpers'

const URL_BASE = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const RUN = Date.now()
const emailFor = (name: string) => `rls-test-${RUN}-${name}@ttz.test`
const PRODUCT_TRAINING = '00000000-0000-0000-0000-0000000000d2'

async function call(name: string, body: unknown, token: string = ANON) {
  const res = await fetch(`${URL_BASE}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json().catch(() => null)) as Record<string, any> | null
  return { status: res.status, data }
}

/** Potpuno ispravna anketa (žena, srednja aktivnost). */
const answers = (email: string, overrides: Record<string, unknown> = {}) => ({
  full_name: 'Test Klijent',
  email,
  phone: '064 123 4567',
  birth_date: '1990-05-20',
  occupation: 'Inženjerka',
  sex: 'female',
  height_cm: '170',
  weight_kg: '68,5',
  country: 'Srbija',
  diagnoses: 'Insulinska rezistencija',
  symptoms: ['fatigue'],
  allergies: false,
  surgery: false,
  childhood_tonsillitis: 'no',
  pregnancies: '1',
  fluids: '1_1_5',
  activity: 'moderate',
  stool: 'daily',
  bedtime: '23:00',
  sleep_hours: '6_7',
  outdoor_time: 'lt30',
  low_sun_country: 'no',
  work_exposure: ['stress'],
  disliked_foods: ['fish'],
  goals: ['fat_loss'],
  place: 'home',
  doctor_limit: 'no',
  chest_pain: 'no',
  injury: 'no',
  medical_restriction: 'no',
  train_duration: '3_12m',
  train_frequency: '1_2',
  technique: 'some',
  long_break: 'no',
  chair_stands: '10_19',
  pushups_knees: '5_10',
  pushups_feet: 'cant',
  plank_knees: '20_44',
  plank_feet: 'unknown',
  single_leg: 'difficult',
  movement_pain: 'no',
  stairs: 'breathless',
  cardio_duration: '20_40',
  recovery: '24_48h',
  channels: ['whatsapp'],
  consent_health: true,
  consent_terms: true,
  ...overrides,
})

const service = createClient(URL_BASE, SERVICE, { auth: { persistSession: false } })
const intakeIds: string[] = []
const newIntakeId = () => {
  const id = crypto.randomUUID()
  intakeIds.push(id)
  return id
}

/** Šalje PDF preko potpisanog upload URL-a i vraća referencu za anketu. */
async function uploadPdf(intakeId: string) {
  const created = await call('upload-intake-file', {
    action: 'create',
    intake_id: intakeId,
    filename: 'nalaz.pdf',
    size: 14,
    type: 'application/pdf',
  })
  expect(created.status).toBe(200)
  const { path, token } = created.data as { path: string; token: string }
  const upload = await anonClient()
    .storage.from('labs')
    .uploadToSignedUrl(path, token, new Blob(['%PDF-1.4 nalaz'], { type: 'application/pdf' }))
  expect(upload.error).toBeNull()
  return { path, name: 'nalaz.pdf', size: 14, type: 'application/pdf' }
}

beforeAll(async () => {
  // Brzi ispad ako `functions serve` nije pokrenut
  const res = await fetch(`${URL_BASE}/functions/v1/payment-webhook`, {
    method: 'POST',
    headers: { apikey: ANON },
    body: '{}',
  }).catch(() => null)
  if (!res || res.status === 404) {
    throw new Error('Edge Functions nisu dostupne. Pokreni: npx supabase functions serve')
  }
})

afterAll(async () => {
  await withDb(async (db) => {
    const users = await db.query<{ id: string }>(`select id from auth.users where email like 'rls-test-%'`)
    const paths: string[] = []
    for (const u of users.rows) {
      const { data } = await service.storage.from('labs').list(u.id)
      paths.push(...(data ?? []).map((f) => `${u.id}/${f.name}`))
    }
    for (const id of intakeIds) {
      const { data } = await service.storage.from('labs').list(`intake/${id}`)
      paths.push(...(data ?? []).map((f) => `intake/${id}/${f.name}`))
    }
    if (paths.length) await service.storage.from('labs').remove(paths)

    // prvo nalozi (kaskadno profil, program, uplata), pa ankete koje nikad nisu povezane
    for (const u of users.rows) await service.auth.admin.deleteUser(u.id)
    await db.query(`delete from intake_surveys where email like 'rls-test-%'`)
    await db.query(`delete from rate_limits where key like 'submit-intake:%'`)
  })
})

describe('upload-intake-file', () => {
  it('odbija nepoznatu ekstenziju, preveliki fajl i neispravan zahtev', async () => {
    const id = newIntakeId()
    const base = { action: 'create', intake_id: id, size: 100 }
    expect((await call('upload-intake-file', { ...base, filename: 'virus.exe' })).status).toBe(400)
    expect(
      (await call('upload-intake-file', { ...base, filename: 'nalaz.pdf', size: 10 * 1024 * 1024 + 1 })).status,
    ).toBe(413)
    expect((await call('upload-intake-file', { action: 'create', intake_id: 'nije-uuid' })).status).toBe(400)
  })

  it('daje potpisani upload, a bucket odbija pogrešan tip fajla', async () => {
    const id = newIntakeId()
    await uploadPdf(id)

    const created = await call('upload-intake-file', {
      action: 'create',
      intake_id: id,
      filename: 'slika.png',
      size: 10,
    })
    const { path, token } = created.data as { path: string; token: string }
    const wrongMime = await anonClient()
      .storage.from('labs')
      .uploadToSignedUrl(path, token, new Blob(['<html></html>'], { type: 'text/html' }))
    expect(wrongMime.error).not.toBeNull()
  })

  it('najviše 10 fajlova po anketi', async () => {
    const id = newIntakeId()
    for (let i = 0; i < 10; i++) await uploadPdf(id)
    const eleventh = await call('upload-intake-file', {
      action: 'create',
      intake_id: id,
      filename: 'jos.pdf',
      size: 10,
    })
    expect(eleventh.status).toBe(400)
    expect(eleventh.data?.error).toBe('Najviše 10 fajlova')
  })

  it('remove briše samo fajlove iz foldera ankete', async () => {
    const id = newIntakeId()
    const ref = await uploadPdf(id)
    const foreign = await call('upload-intake-file', {
      action: 'remove',
      intake_id: id,
      path: `intake/${crypto.randomUUID()}/x.pdf`,
    })
    expect(foreign.status).toBe(400)
    expect((await call('upload-intake-file', { action: 'remove', intake_id: id, path: ref.path })).status).toBe(
      200,
    )
  })
})

describe('submit-intake', () => {
  it('odbija nevažeću anketu (17 godina) sa porukom za polje', async () => {
    const result = await call('submit-intake', {
      intake_id: newIntakeId(),
      answers: answers(emailFor('mlad'), { birth_date: `${new Date().getFullYear() - 17}-01-01` }),
    })
    expect(result.status).toBe(400)
    expect(result.data?.fields?.birth_date).toBe('Program je za osobe starije od 18 godina')
  })

  it('čuva anketu i nalaze, izvodi nivo vežbi iz Ognjenovih odgovora i ne dozvoljava dupli upis', async () => {
    const id = newIntakeId()
    const email = emailFor('anketa')
    const file = await uploadPdf(id)

    const ok = await call('submit-intake', { intake_id: id, answers: answers(email, { lab_files: [file] }) })
    expect(ok.status).toBe(200)
    expect(ok.data).toEqual({ intake_id: id, email })

    await withDb(async (db) => {
      const { rows } = await db.query(`select * from intake_surveys where id = $1`, [id])
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        client_id: null,
        email,
        phone: '+381641234567',
        sex: 'female',
        activity_level: 'moderate',
        exercise_level: 'intermediate',
        schema_version: 2,
        consent_health: true,
      })
      expect(Number(rows[0].height_cm)).toBe(170)
      expect(Number(rows[0].start_weight_kg)).toBe(68.5)
      expect(rows[0].answers.channels).toEqual(['whatsapp'])
      expect(rows[0].answers.pregnancies).toBe('1')

      const files = await db.query(`select storage_path, client_id from lab_files where intake_id = $1`, [id])
      expect(files.rows).toEqual([{ storage_path: file.path, client_id: null }])
    })

    const again = await call('submit-intake', { intake_id: id, answers: answers(email) })
    expect(again.status).toBe(409)
  })

  it('ignoriše fajlove koji ne postoje u skladištu', async () => {
    const id = newIntakeId()
    const fake = { path: `intake/${id}/nema.pdf`, name: 'nema.pdf', size: 10, type: 'application/pdf' }
    const ok = await call('submit-intake', {
      intake_id: id,
      answers: answers(emailFor('bezfajla'), { lab_files: [fake] }),
    })
    expect(ok.status).toBe(200)
    await withDb(async (db) => {
      const { rows } = await db.query(`select 1 from lab_files where intake_id = $1`, [id])
      expect(rows).toHaveLength(0)
    })
  })

  it('anonimni korisnik i dalje ne može da čita ankete ni nalaze', async () => {
    const anon = anonClient()
    expect((await anon.from('intake_surveys').select('id')).data ?? []).toEqual([])
    expect((await anon.from('lab_files').select('id')).data ?? []).toEqual([])
    expect((await anon.storage.from('labs').list('intake')).data ?? []).toEqual([])
  })

  it('rate limit vraća 429 kad je prozor popunjen', async () => {
    await call('submit-intake', { intake_id: newIntakeId(), answers: {} }) // upiše ključ za naš IP
    await withDb(async (db) => {
      await db.query(
        `update rate_limits set count = 1000000, window_start = now() where key like 'submit-intake:%'`,
      )
    })
    const blocked = await call('submit-intake', { intake_id: newIntakeId(), answers: {} })
    expect(blocked.status).toBe(429)
    await withDb((db) => db.query(`delete from rate_limits where key like 'submit-intake:%'`))
  })
})

describe('create-checkout i confirm-payment', () => {
  const email = emailFor('klijent')
  const password = 'Lozinka-za-test-1'
  const intakeId = crypto.randomUUID()
  let file: Awaited<ReturnType<typeof uploadPdf>>
  let created: Awaited<ReturnType<typeof call>>
  let userId: string

  beforeAll(async () => {
    intakeIds.push(intakeId)
    file = await uploadPdf(intakeId)
    const submit = await call('submit-intake', {
      intake_id: intakeId,
      answers: answers(email, { lab_files: [file] }),
    })
    expect(submit.status).toBe(200)
  })

  it('proverava email, lozinku, plan i saglasnost', async () => {
    const base = { intake_id: intakeId, email, password, product_id: PRODUCT_TRAINING, consent: true }
    expect((await call('create-checkout', { ...base, email: 'neko-drugi@ttz.test' })).status).toBe(403)
    expect((await call('create-checkout', { ...base, password: 'kratko' })).status).toBe(400)
    expect((await call('create-checkout', { ...base, consent: false })).status).toBe(400)
    expect((await call('create-checkout', { ...base, product_id: crypto.randomUUID() })).status).toBe(400)
    expect((await call('create-checkout', { ...base, intake_id: crypto.randomUUID() })).status).toBe(404)
  })

  it('pravi nalog, program, uplatu i premešta nalaze', async () => {
    created = await call('create-checkout', {
      intake_id: intakeId,
      email,
      password,
      product_id: PRODUCT_TRAINING,
      consent: true,
    })
    expect(created.status).toBe(200)
    expect(created.data?.amount_rsd).toBe(12900)
    expect(created.data?.instructions.reference).toMatch(/^TTZ-[0-9A-F]{8}$/)

    await withDb(async (db) => {
      const user = await db.query(`select id from auth.users where email = $1`, [email])
      expect(user.rows).toHaveLength(1)
      userId = user.rows[0].id

      const profile = await db.query(`select role, full_name, phone, preferred_channels::text[] as preferred_channels from profiles where id = $1`, [userId])
      expect(profile.rows[0]).toMatchObject({
        role: 'client',
        full_name: 'Test Klijent',
        phone: '+381641234567',
        preferred_channels: ['whatsapp'],
      })

      const program = await db.query(
        `select status, duration_days, exercise_level, intake_id, activated_at, paid_at from programs where client_id = $1`,
        [userId],
      )
      expect(program.rows).toEqual([
        {
          status: 'awaiting_payment',
          duration_days: 30,
          exercise_level: 'intermediate',
          intake_id: intakeId,
          activated_at: null,
          paid_at: null,
        },
      ])

      const payment = await db.query(`select status, amount_rsd, provider, provider_ref from payments where client_id = $1`, [userId])
      expect(payment.rows).toEqual([
        {
          status: 'pending',
          amount_rsd: 12900,
          provider: 'manual',
          provider_ref: created.data?.instructions.reference,
        },
      ])

      const intake = await db.query(`select client_id from intake_surveys where id = $1`, [intakeId])
      expect(intake.rows[0].client_id).toBe(userId)

      const files = await db.query(`select storage_path, client_id from lab_files where intake_id = $1`, [intakeId])
      expect(files.rows).toHaveLength(1)
      expect(files.rows[0].client_id).toBe(userId)
      expect(files.rows[0].storage_path.startsWith(`${userId}/`)).toBe(true)
    })

    // fajl je stvarno u folderu klijenta, a klijent ga vidi, ali ne i stari put
    const client: TtzClient = anonClient()
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull()
    const listed = await client.storage.from('labs').list(userId)
    expect(listed.data?.length).toBe(1)
    const oldPath = await service.storage.from('labs').download(file.path)
    expect(oldPath.error).not.toBeNull()
  })

  it('druga kupovina sa istom anketom ili istim emailom se odbija', async () => {
    const same = await call('create-checkout', {
      intake_id: intakeId,
      email,
      password,
      product_id: PRODUCT_TRAINING,
      consent: true,
    })
    expect(same.status).toBe(409)

    const otherIntake = newIntakeId()
    const submit = await call('submit-intake', { intake_id: otherIntake, answers: answers(email) })
    expect(submit.status).toBe(200)
    const duplicateEmail = await call('create-checkout', {
      intake_id: otherIntake,
      email,
      password,
      product_id: PRODUCT_TRAINING,
      consent: true,
    })
    expect(duplicateEmail.status).toBe(409)
    expect(duplicateEmail.data?.error).toContain('već postoji')
    await withDb(async (db) => {
      const { rows } = await db.query(`select client_id from intake_surveys where id = $1`, [otherIntake])
      expect(rows[0].client_id).toBeNull() // anketa ostaje netaknuta
    })
  })

  it('confirm-payment: samo admin, idempotentno', async () => {
    const paymentId = created.data?.payment_id as string

    expect((await call('confirm-payment', { payment_id: paymentId })).status).toBe(401)
    expect((await call('confirm-payment', { payment_id: 'nije-uuid' })).status).toBe(400)

    const clientSession = await anonClient().auth.signInWithPassword({ email, password })
    const clientJwt = clientSession.data.session!.access_token
    expect((await call('confirm-payment', { payment_id: paymentId }, clientJwt)).status).toBe(403)

    const olgica = await clientFor('olgica')
    const olgicaJwt = (await olgica.auth.getSession()).data.session!.access_token
    expect((await call('confirm-payment', { payment_id: paymentId }, olgicaJwt)).status).toBe(403)

    const admin = await clientFor('admin')
    const adminJwt = (await admin.auth.getSession()).data.session!.access_token

    const first = await call('confirm-payment', { payment_id: paymentId }, adminJwt)
    expect(first.status).toBe(200)
    expect(first.data?.already_paid).toBe(false)

    const state = async () =>
      withDb(async (db) => {
        const p = await db.query(`select status, paid_at from payments where id = $1`, [paymentId])
        const g = await db.query(`select status, paid_at from programs where client_id = $1`, [userId])
        return { payment: p.rows[0], program: g.rows[0] }
      })
    const afterFirst = await state()
    expect(afterFirst.payment.status).toBe('paid')
    expect(afterFirst.program.status).toBe('building_plan')
    expect(afterFirst.program.paid_at).not.toBeNull()

    const second = await call('confirm-payment', { payment_id: paymentId }, adminJwt)
    expect(second.status).toBe(200)
    expect(second.data?.already_paid).toBe(true)
    expect(await state()).toEqual(afterFirst) // drugi klik ništa ne menja

    expect((await call('confirm-payment', { payment_id: crypto.randomUUID() }, adminJwt)).status).toBe(404)
  })

  it('klijent posle uplate vidi program u statusu building_plan', async () => {
    const client = anonClient()
    await client.auth.signInWithPassword({ email, password })
    const { data } = await client.from('programs').select('status')
    expect(data).toEqual([{ status: 'building_plan' }])
  })
})

describe('payment-webhook', () => {
  it('odbija nepoznatog i ručnog providera', async () => {
    const unknown = await fetch(`${URL_BASE}/functions/v1/payment-webhook?provider=nepoznat`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(unknown.status).toBe(501)
    const manual = await fetch(`${URL_BASE}/functions/v1/payment-webhook?provider=manual`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(manual.status).toBe(501)
  })
})
