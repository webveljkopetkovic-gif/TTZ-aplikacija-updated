import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import pg from 'pg'
import type { Database } from '../../src/lib/database.types'

export const SEED_PASSWORD = 'Ttz-dev-2026!'

export const IDS = {
  olgica: '00000000-0000-0000-0000-0000000000a1',
  ognjen: '00000000-0000-0000-0000-0000000000a2',
  veljko: '00000000-0000-0000-0000-0000000000a3',
  admin: '00000000-0000-0000-0000-0000000000a4',
  jelena: '00000000-0000-0000-0000-0000000000c1',
  ana: '00000000-0000-0000-0000-0000000000c2',
  ivana: '00000000-0000-0000-0000-0000000000c3',
  programJelena: '00000000-0000-0000-0000-0000000000f1',
  programAna: '00000000-0000-0000-0000-0000000000f2',
  programIvana: '00000000-0000-0000-0000-0000000000f3',
} as const

export type TtzClient = SupabaseClient<Database>

const url = () => process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const anonKey = () => process.env.VITE_SUPABASE_ANON_KEY ?? ''

export function anonClient(): TtzClient {
  return createClient<Database>(url(), anonKey(), { auth: { persistSession: false } })
}

/** Prijavljen klijent za seed nalog, npr. `clientFor('ana')`. */
export async function clientFor(user: 'olgica' | 'ognjen' | 'veljko' | 'admin' | 'jelena' | 'ana' | 'ivana') {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({
    email: `${user}@ttz.test`,
    password: SEED_PASSWORD,
  })
  if (error) throw new Error(`Prijava ${user} nije uspela: ${error.message}`)
  return client
}

/** Direktna veza na lokalni Postgres (strukturne provere i poređenje SQL funkcija). */
export async function withDb<T>(fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({
    connectionString: process.env.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  })
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}
