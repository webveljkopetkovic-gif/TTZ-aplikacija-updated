/** Faza 9: push pretplate. Klijent upravlja samo svojim uređajima, niko drugi ih ne vidi. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clientFor, IDS, withDb, type TtzClient } from './helpers'

let ana: TtzClient
let ivana: TtzClient
let olgica: TtzClient
const endpoint = 'https://push.example.test/ttz-test-ana'

async function clean() {
  await withDb((db) => db.query(`delete from push_subscriptions where endpoint like 'https://push.example.test/%'`))
}

beforeAll(async () => {
  ;[ana, ivana, olgica] = await Promise.all([clientFor('ana'), clientFor('ivana'), clientFor('olgica')])
  await clean()
})
afterAll(clean)

describe('push_subscriptions (RLS)', () => {
  it('klijent upisuje svoj uređaj', async () => {
    const { error } = await ana
      .from('push_subscriptions')
      .insert({ user_id: IDS.ana, endpoint, p256dh: 'k', auth: 'a' })
    expect(error).toBeNull()
  })

  it('ne može da upiše uređaj na tuđe ime', async () => {
    const { error } = await ana
      .from('push_subscriptions')
      .insert({ user_id: IDS.ivana, endpoint: `${endpoint}-x`, p256dh: 'k', auth: 'a' })
    expect(error).not.toBeNull()
  })

  it('drugi klijent i tim ne vide tuđe uređaje', async () => {
    for (const who of [ivana, olgica]) {
      const { data } = await who.from('push_subscriptions').select('id').eq('endpoint', endpoint)
      expect(data).toEqual([])
    }
  })

  it('drugi klijent ne može da obriše tuđi uređaj', async () => {
    await ivana.from('push_subscriptions').delete().eq('endpoint', endpoint)
    const { data } = await ana.from('push_subscriptions').select('id').eq('endpoint', endpoint)
    expect(data).toHaveLength(1)
  })

  it('vlasnik briše svoj uređaj', async () => {
    await ana.from('push_subscriptions').delete().eq('endpoint', endpoint)
    const { data } = await ana.from('push_subscriptions').select('id').eq('endpoint', endpoint)
    expect(data).toEqual([])
  })
})
