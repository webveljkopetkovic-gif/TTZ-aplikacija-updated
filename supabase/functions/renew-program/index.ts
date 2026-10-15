// Klijent bira nastavak: „Nastavi 30 dana“ ili „Samo ishrana“. Pravi se novi program (awaiting_payment) sa
// previous_program_id, uplata (isti tok kao prva kupovina), a poslednji važeći obroci i suplementi se kopiraju
// kao osnova za novi plan. Posle uplate sledi Dan 0, pa novi Dan 1. Idempotentno: drugi poziv vraća isti program.
import { z } from 'zod'
import { adminClient, callerOf, HttpError, json, serve } from '../_shared/http.ts'
import { defaultProvider } from '../_shared/payments/index.ts'
import { programDayOn } from '../_shared/schedule.ts'

const body = z.object({
  program_id: z.guid(),
  option: z.enum(['continue', 'nutrition_only']),
})

/** Nastavak se otvara na dan `trajanje − 2` (najava) i traje do kraja pristupa. */
const OPENS_BEFORE_END_DAYS = 2

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) throw new HttpError('Neispravan zahtev', 400)
  const { program_id, option } = parsed.data

  const admin = adminClient()
  const caller = await callerOf(admin, req)
  if (!caller) throw new HttpError('Potrebna je prijava', 401)

  const { data: previous, error } = await admin
    .from('programs')
    .select(
      'id, client_id, status, intake_id, duration_days, activated_at, exercise_level, plan_focus, training_weekdays, products ( kind )',
    )
    .eq('id', program_id)
    .maybeSingle()
  if (error) throw error
  // tuđ program se ne razlikuje od nepostojećeg
  if (!previous || previous.client_id !== caller.id) throw new HttpError('Program nije pronađen', 404)

  // već postoji nastavak: vrati ga umesto da praviš drugi
  const { data: existing } = await admin
    .from('programs')
    .select('id, status')
    .eq('previous_program_id', previous.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing) return json({ program_id: existing.id, existing: true })

  if (previous.status !== 'active' && previous.status !== 'ended') {
    throw new HttpError('Nastavak je moguć na kraju programa', 409)
  }
  if (
    previous.status === 'active' &&
    programDayOn(previous.activated_at) < previous.duration_days - OPENS_BEFORE_END_DAYS
  ) {
    throw new HttpError('Ponuda za nastavak se otvara dva dana pre kraja programa', 409)
  }

  const previousKind = (previous as unknown as { products: { kind: string } | null }).products?.kind
  if (option === 'nutrition_only' && previousKind !== 'nutrition_training') {
    throw new HttpError('Tvoj plan već sadrži samo ishranu', 400)
  }
  const kind = option === 'nutrition_only' ? 'nutrition' : previousKind
  if (!kind) throw new HttpError('Plan nije pronađen', 400)

  const { data: product } = await admin
    .from('products')
    .select('id, price_rsd, duration_days')
    .eq('kind', kind)
    .eq('active', true)
    .order('price_rsd')
    .limit(1)
    .maybeSingle()
  if (!product) throw new HttpError('Izabrani plan trenutno nije dostupan', 400)

  const { data: profile } = await admin.from('profiles').select('email').eq('id', caller.id).single()

  const { data: created } = await admin
    .from('programs')
    .insert({
      client_id: caller.id,
      product_id: product.id,
      intake_id: previous.intake_id,
      previous_program_id: previous.id,
      status: 'awaiting_payment',
      duration_days: product.duration_days,
      exercise_level: kind === 'nutrition_training' ? previous.exercise_level : null,
      plan_focus: previous.plan_focus,
      training_weekdays: previous.training_weekdays,
    })
    .select('id')
    .single()
    .throwOnError()
  const programId = created.id as string

  try {
    const paymentId = crypto.randomUUID()
    const checkout = await defaultProvider.createCheckout({
      paymentId,
      programId,
      amountRsd: product.price_rsd,
      customerEmail: profile?.email ?? '',
    })
    await admin
      .from('payments')
      .insert({
        id: paymentId,
        program_id: programId,
        client_id: caller.id,
        amount_rsd: product.price_rsd,
        provider: checkout.provider,
        provider_ref: checkout.reference,
        status: 'pending',
      })
      .throwOnError()

    // osnova za novi plan: za svaki dan i obrok važi poslednja verzija (najveći valid_from_cycle)
    const { data: meals } = await admin
      .from('program_meals')
      .select('plan_day, slot, time_of_day, title, description, recipe, photo_path, valid_from_cycle')
      .eq('program_id', previous.id)
    const latest = new Map<string, NonNullable<typeof meals>[number]>()
    for (const meal of meals ?? []) {
      const key = `${meal.plan_day}:${meal.slot}`
      if (!latest.has(key) || latest.get(key)!.valid_from_cycle < meal.valid_from_cycle) {
        latest.set(key, meal)
      }
    }
    if (latest.size > 0) {
      await admin
        .from('program_meals')
        .insert(
          [...latest.values()].map((meal) => ({
            program_id: programId,
            plan_day: meal.plan_day,
            slot: meal.slot,
            time_of_day: meal.time_of_day,
            title: meal.title,
            description: meal.description,
            recipe: meal.recipe,
            photo_path: meal.photo_path,
            valid_from_cycle: 1,
          })),
        )
        .throwOnError()
    }
    const { data: supplements } = await admin
      .from('supplements')
      .select('name, timing, note')
      .eq('program_id', previous.id)
      .eq('active', true)
    if (supplements?.length) {
      await admin
        .from('supplements')
        .insert(supplements.map((s) => ({ ...s, program_id: programId })))
        .throwOnError()
    }

    return json({
      program_id: programId,
      payment_id: paymentId,
      amount_rsd: product.price_rsd,
      instructions: checkout.instructions ?? null,
      redirect_url: checkout.redirectUrl ?? null,
      existing: false,
    })
  } catch (e) {
    // bez uplate i plana nema smisla ostaviti novi program (kaskadno briše i uplatu i kopirane obroke)
    console.error('renew-program nije uspeo, brišem novi program', e)
    await admin.from('programs').delete().eq('id', programId)
    throw e
  }
})
