import { beforeAll, describe, expect, it } from 'vitest'
import { anonClient, clientFor, IDS, type TtzClient } from './helpers'

/** Tabele sa zdravstvenim podacima: partner ne sme da pročita nijednu. */
const HEALTH_TABLES = [
  'profiles',
  'intake_surveys',
  'lab_files',
  'programs',
  'payments',
  'meal_templates',
  'meal_template_items',
  'program_meals',
  'meal_logs',
  'supplements',
  'supplement_logs',
  'workout_logs',
  'measurements',
  'progress_photos',
  'feedbacks',
  'feedback_replies',
  'messages',
  'team_notes',
  'notifications',
  'reminder_settings',
] as const

let ana: TtzClient
let ivana: TtzClient
let olgica: TtzClient
let ognjen: TtzClient
let veljko: TtzClient

beforeAll(async () => {
  ;[ana, ivana, olgica, ognjen, veljko] = await Promise.all([
    clientFor('ana'),
    clientFor('ivana'),
    clientFor('olgica'),
    clientFor('ognjen'),
    clientFor('veljko'),
  ])
})

describe('seed nalozi', () => {
  it.each(['olgica', 'ognjen', 'veljko', 'admin', 'jelena', 'ana', 'ivana'] as const)(
    '%s se prijavljuje',
    async (user) => {
      await expect(clientFor(user)).resolves.toBeDefined()
    },
  )
})

describe('klijent A ne vidi podatke klijenta B', () => {
  it('vidi samo svoj program, anketu i uplatu', async () => {
    const programs = await ana.from('programs').select('id, client_id')
    expect(programs.error).toBeNull()
    expect(programs.data).toEqual([{ id: IDS.programAna, client_id: IDS.ana }])

    const intake = await ana.from('intake_surveys').select('client_id')
    expect(intake.data).toEqual([{ client_id: IDS.ana }])

    const payments = await ana.from('payments').select('client_id')
    expect(payments.data).toEqual([{ client_id: IDS.ana }])
  })

  it('ne može da pročita ništa od Ivane po id-ju', async () => {
    const checks = await Promise.all([
      ana.from('programs').select('id').eq('client_id', IDS.ivana),
      ana.from('intake_surveys').select('id').eq('client_id', IDS.ivana),
      ana.from('messages').select('id').eq('client_id', IDS.ivana),
      ana.from('measurements').select('id').eq('program_id', IDS.programIvana),
      ana.from('feedbacks').select('id').eq('program_id', IDS.programIvana),
      ana.from('program_meals').select('id').eq('program_id', IDS.programIvana),
      ana.from('supplements').select('id').eq('program_id', IDS.programIvana),
      ana.from('feedback_replies').select('id'),
      ana.from('profiles').select('id').eq('id', IDS.ivana),
    ])
    for (const result of checks) {
      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    }
  })

  it('vidi samo svoj profil', async () => {
    const { data } = await ana.from('profiles').select('id')
    expect(data).toEqual([{ id: IDS.ana }])
  })

  it('ne može da menja Ivanine podatke', async () => {
    const update = await ana
      .from('feedbacks')
      .update({ status: 'submitted' })
      .eq('program_id', IDS.programIvana)
      .select()
    expect(update.data ?? []).toEqual([])

    const insert = await ana
      .from('messages')
      .insert({ client_id: IDS.ivana, sender: 'client', body: 'lažna poruka' })
    expect(insert.error).not.toBeNull()
  })

  it('Ivana ne vidi Anine nalaze (storage)', async () => {
    const path = `${IDS.ana}/rls-test.pdf`
    const file = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' })

    const upload = await ana.storage.from('labs').upload(path, file, { upsert: true })
    expect(upload.error).toBeNull()
    try {
      const own = await ana.storage.from('labs').download(path)
      expect(own.error).toBeNull()

      const other = await ivana.storage.from('labs').download(path)
      expect(other.error).not.toBeNull()

      const list = await ivana.storage.from('labs').list(IDS.ana)
      expect(list.data ?? []).toEqual([])

      const intrusion = await ivana.storage
        .from('labs')
        .upload(`${IDS.ana}/upad.pdf`, file, { upsert: true })
      expect(intrusion.error).not.toBeNull()

      const team = await olgica.storage.from('labs').download(path)
      expect(team.error).toBeNull()
    } finally {
      await olgica.storage.from('labs').remove([path])
    }
  })
})

describe('beleške tima', () => {
  it('klijent ne vidi team_notes', async () => {
    for (const client of [ana, ivana]) {
      const { data, error } = await client.from('team_notes').select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
    }
  })

  it('klijent ne može da upiše belešku', async () => {
    const { error } = await ana
      .from('team_notes')
      .insert({ client_id: IDS.ana, author_id: IDS.ana, body: 'x' })
    expect(error).not.toBeNull()
  })

  it('tim vidi beleške', async () => {
    for (const client of [olgica, ognjen]) {
      const { data } = await client.from('team_notes').select('client_id')
      expect(data).toEqual([{ client_id: IDS.ana }])
    }
  })
})

describe('partner (Veljko)', () => {
  it.each(HEALTH_TABLES)('ne čita tuđe podatke iz tabele %s', async (table) => {
    const { data, error } = await veljko.from(table).select('*')
    expect(error).toBeNull()
    // Jedino što partner sme da vidi su redovi vezani za njegov sopstveni nalog (profil, podešavanja).
    const owners = (data ?? []).map((row) => {
      const r = row as { id?: string; client_id?: string }
      return table === 'profiles' ? r.id : r.client_id
    })
    expect(owners.filter((owner) => owner !== IDS.veljko)).toEqual([])
  })

  it('ne vidi pregled klijenata tima', async () => {
    const { data } = await veljko.from('team_client_overview').select('*')
    expect(data ?? []).toEqual([])
  })

  it('ne čita view partner_revenue direktno', async () => {
    const { error } = await veljko.from('partner_revenue' as never).select('*')
    expect(error).not.toBeNull()
  })

  it('get_partner_revenue vraća samo prihode', async () => {
    const { data, error } = await veljko.rpc('get_partner_revenue')
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
    expect(Object.keys(data![0]).sort()).toEqual(
      ['kind', 'month', 'partner_share_rsd', 'revenue_rsd', 'sales'].sort(),
    )
    const revenue = data!.reduce((sum, row) => sum + Number(row.revenue_rsd), 0)
    const share = data!.reduce((sum, row) => sum + Number(row.partner_share_rsd), 0)
    expect(revenue).toBe(3 * 12900)
    expect(share).toBe(Math.round(3 * 12900 * 0.3))
  })

  it('klijent ne dobija prihode preko get_partner_revenue', async () => {
    const { data } = await ana.rpc('get_partner_revenue')
    expect(data ?? []).toEqual([])
  })
})

describe('anonimni korisnik', () => {
  it.each(HEALTH_TABLES)('ne čita tabelu %s', async (table) => {
    const { data, error } = await anonClient().from(table).select('*')
    expect(error === null ? data : []).toEqual([])
  })

  it('ne čita ankete ni pregled tima', async () => {
    const intake = await anonClient().from('intake_surveys').select('id')
    expect(intake.data ?? []).toEqual([])
    const overview = await anonClient().from('team_client_overview').select('id' as never)
    expect(overview.error).not.toBeNull()
  })

  it('ne lista bucket labs', async () => {
    const { data } = await anonClient().storage.from('labs').list('', { limit: 10 })
    expect(data ?? []).toEqual([])
  })

  it('vidi samo aktivne proizvode', async () => {
    const { data } = await anonClient().from('products').select('name, active')
    expect(data?.length).toBe(2)
    expect(data?.every((p) => p.active)).toBe(true)
  })
})

describe('uloge', () => {
  it('klijent ne može sam sebi da promeni ulogu', async () => {
    const { error } = await ana.from('profiles').update({ role: 'admin' }).eq('id', IDS.ana)
    expect(error?.message).toContain('Samo admin menja ulogu')

    const { data } = await ana.from('profiles').select('role').eq('id', IDS.ana).single()
    expect(data?.role).toBe('client')
  })

  it('tim vidi sve klijente, ankete i programe', async () => {
    for (const client of [olgica, ognjen]) {
      const programs = await client.from('programs').select('id')
      expect(programs.data).toHaveLength(3)
      const intake = await client.from('intake_surveys').select('id')
      expect(intake.data).toHaveLength(3)
    }
  })

  it('team_client_overview daje statuse iz PLAN-a 4.8', async () => {
    const { data, error } = await olgica
      .from('team_client_overview')
      .select('full_name, team_status, program_day, next_feedback_day, pending_review_count')
      .order('full_name')
    expect(error).toBeNull()
    expect(data).toEqual([
      {
        full_name: 'Ana Marković',
        team_status: 'active',
        program_day: 1,
        next_feedback_day: 10,
        pending_review_count: 0,
      },
      {
        full_name: 'Ivana Jović',
        team_status: 'active',
        program_day: 20,
        next_feedback_day: 20,
        pending_review_count: 1,
      },
      {
        full_name: 'Jelena Petrović',
        team_status: 'new_plan',
        program_day: 0,
        next_feedback_day: null,
        pending_review_count: 0,
      },
    ])
  })

  it('klijent kroz team_client_overview vidi najviše sebe', async () => {
    const { data } = await ana.from('team_client_overview').select('client_id')
    expect(data).toEqual([{ client_id: IDS.ana }])
  })
})

describe('rate_limits i app_settings', () => {
  it('rate_limits ne čita niko osim service role funkcije', async () => {
    for (const client of [anonClient(), ana, olgica]) {
      const { data } = await client.from('rate_limits').select('*')
      expect(data ?? []).toEqual([])
    }
    const rpc = await ana.rpc('check_rate_limit', { p_key: 'x', p_max: 1, p_window_seconds: 60 })
    expect(rpc.error).not.toBeNull() // izvršava je samo service role
  })

  it('podešavanja za uplatu vide prijavljeni, ali ne anon', async () => {
    const anon = await anonClient().from('app_settings').select('key')
    expect(anon.data ?? []).toEqual([])
    const own = await ana.from('app_settings').select('key').eq('key', 'manual_payment')
    expect(own.data).toEqual([{ key: 'manual_payment' }])
  })

  it('podešavanja menja samo admin', async () => {
    const asClient = await ana
      .from('app_settings')
      .update({ value: { recipient: 'hakeri', account: '1' } })
      .eq('key', 'manual_payment')
      .select()
    expect(asClient.data ?? []).toEqual([])

    const asTeam = await olgica
      .from('app_settings')
      .update({ value: { recipient: 'tim', account: '1' } })
      .eq('key', 'manual_payment')
      .select()
    expect(asTeam.data ?? []).toEqual([])

    const { data } = await ana.from('app_settings').select('value').eq('key', 'manual_payment').single()
    expect((data?.value as { recipient: string }).recipient).toBe('[primalac uplate]')
  })
})
