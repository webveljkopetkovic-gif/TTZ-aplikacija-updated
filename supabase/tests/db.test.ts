import { describe, expect, it } from 'vitest'
import { planCycle, planDay, programDay } from '../../src/lib/programDay'
import { IDS, withDb } from './helpers'

describe('RLS na svakoj tabeli (CLAUDE.md: nova tabela bez RLS = greška)', () => {
  it('sve tabele u šemi public imaju uključen RLS', async () => {
    const rows = await withDb(async (db) => {
      const res = await db.query<{ relname: string }>(`
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
        order by 1`)
      return res.rows.map((r) => r.relname)
    })
    expect(rows).toEqual([])
  })

  it('svaka tabela ima bar jednu politiku, osim tabela bez klijentskog pristupa', async () => {
    const rows = await withDb(async (db) => {
      const res = await db.query<{ relname: string }>(`
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p')
          and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
        order by 1`)
      return res.rows.map((r) => r.relname)
    })
    // payments i ostale imaju politike; ovde ne sme da se pojavi nijedna tabela
    expect(rows).toEqual([])
  })

  it('storage bucketi su privatni', async () => {
    const rows = await withDb(async (db) => {
      const res = await db.query<{ id: string; public: boolean }>(
        `select id, public from storage.buckets where id in ('labs','photos','meals','reports') order by id`,
      )
      return res.rows
    })
    expect(rows).toEqual([
      { id: 'labs', public: false },
      { id: 'meals', public: false },
      { id: 'photos', public: false },
      { id: 'reports', public: false },
    ])
  })
})

describe('SQL funkcije dana daju iste vrednosti kao src/lib/programDay.ts', () => {
  it('program_day, plan_day i plan_cycle za dane 0–45', async () => {
    const activated = '2026-01-05'
    await withDb(async (db) => {
      for (let day = 1; day <= 45; day++) {
        const today = new Date(Date.UTC(2026, 0, 5 + day - 1)).toISOString().slice(0, 10)
        const { rows } = await db.query<{ d: number; pd: number; pc: number }>(
          `select program_day($1::date, $2::date) as d, plan_day($3::int) as pd, plan_cycle($3::int) as pc`,
          [activated, today, day],
        )
        expect(rows[0].d).toBe(programDay(activated, today))
        expect(rows[0].pd).toBe(planDay(day))
        expect(rows[0].pc).toBe(planCycle(day))
      }
      const zero = await db.query(`select program_day(null::date) as d, plan_day(0) as pd, plan_cycle(0) as pc`)
      expect(zero.rows[0]).toEqual({ d: 0, pd: 0, pc: 0 })
    })
  })
})

describe('seed klijenti na tačnim danima (PLAN.md, Faza 4 "Gotovo kad")', () => {
  type Row = { day: number; plan_day: number; cycle: number }
  const dayOf = async (programId: string, activatedOffset?: number): Promise<Row> =>
    withDb(async (db) => {
      await db.query('begin')
      try {
        if (activatedOffset !== undefined) {
          await db.query(
            `update programs set activated_at = (now() at time zone 'Europe/Belgrade')::date - $2::int where id = $1`,
            [programId, activatedOffset],
          )
        }
        const { rows } = await db.query<Row>(
          `select program_day(activated_at) as day, plan_day(program_day(activated_at)) as plan_day,
                  plan_cycle(program_day(activated_at)) as cycle
           from programs where id = $1`,
          [programId],
        )
        return rows[0]
      } finally {
        await db.query('rollback')
      }
    })

  it('Ana je na danu 1, plan dan 1, 1. krug', async () => {
    expect(await dayOf(IDS.programAna)).toEqual({ day: 1, plan_day: 1, cycle: 1 })
  })

  it('Ivana je na danu 20, plan dan 6, 2. krug', async () => {
    expect(await dayOf(IDS.programIvana)).toEqual({ day: 20, plan_day: 6, cycle: 2 })
  })

  it('Jelena je na danu 0', async () => {
    expect(await dayOf(IDS.programJelena)).toEqual({ day: 0, plan_day: 0, cycle: 0 })
  })

  it('kad se activated_at pomeri, dan 29 je plan dan 1 u 3. krugu', async () => {
    expect(await dayOf(IDS.programAna, 28)).toEqual({ day: 29, plan_day: 1, cycle: 3 })
  })

  it('obrok za Ivanu na danu 20 je izmena koja važi od 2. kruga', async () => {
    const title = await withDb(async (db) => {
      const { rows } = await db.query<{ title: string }>(
        `select title from program_meals
         where program_id = $1 and plan_day = 6 and slot = 'lunch' and valid_from_cycle <= 2
         order by valid_from_cycle desc limit 1`,
        [IDS.programIvana],
      )
      return rows[0].title
    })
    expect(title).toBe('Ćuretina umesto piletine, manje začina')
  })
})

describe('seed poštuje pravila domena', () => {
  it('nijedan obrok ne sadrži kalorije, grame ni vaganje', async () => {
    const rows = await withDb(async (db) => {
      const res = await db.query(
        `select title from program_meals where title ~* '(kcal|kalorij|vagan|[0-9]\\s*(g|gr|kg)\\M)'`,
      )
      return res.rows
    })
    expect(rows).toEqual([])
  })

  it('šablon ima 14 dana × 5 obroka', async () => {
    const count = await withDb(async (db) => {
      const { rows } = await db.query<{ n: string }>(`select count(*) as n from meal_template_items`)
      return Number(rows[0].n)
    })
    expect(count).toBe(70)
  })

  it('ima 6 vežbi, po 2 za svaki nivo', async () => {
    const rows = await withDb(async (db) => {
      const res = await db.query<{ level: string; n: string }>(
        `select level, count(*) as n from workouts group by level order by level::text`,
      )
      return res.rows.map((r) => [r.level, Number(r.n)])
    })
    expect(rows).toEqual([
      ['advanced', 2],
      ['beginner', 2],
      ['intermediate', 2],
    ])
  })
})
