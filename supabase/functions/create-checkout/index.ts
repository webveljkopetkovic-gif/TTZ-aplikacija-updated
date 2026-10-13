// "Plati i aktiviraj plan": pravi nalog, povezuje anketu, pravi program (awaiting_payment) i uplatu (pending).
// Traži intake_id i email iz ankete, da se tuđa anketa ne može iskoristiti samo pogađanjem id-ja.
import { z } from 'zod'
import { adminClient, enforceRateLimit, HttpError, json, serve } from '../_shared/http.ts'
import { defaultProvider } from '../_shared/payments/index.ts'

const body = z.object({
  intake_id: z.guid(),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8, 'Lozinka ima najmanje 8 znakova').max(72, 'Lozinka može imati najviše 72 znaka'),
  product_id: z.guid(),
  consent: z.literal(true),
})

serve(async (req, raw) => {
  const parsed = body.safeParse(raw)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message
    throw new HttpError(fields.password ?? 'Proveri unete podatke', 400, fields)
  }
  const input = parsed.data

  const admin = adminClient()
  await enforceRateLimit(admin, req, 'create-checkout', 10)

  const { data: intake, error: intakeError } = await admin
    .from('intake_surveys')
    .select('id, email, phone, full_name, client_id, exercise_level, answers')
    .eq('id', input.intake_id)
    .maybeSingle()
  if (intakeError) throw intakeError
  if (!intake) throw new HttpError('Anketa nije pronađena', 404)
  if (intake.email.toLowerCase() !== input.email) {
    throw new HttpError('Email se ne poklapa sa emailom iz ankete', 403)
  }
  if (intake.client_id) throw new HttpError('Nalog za ovu anketu je već napravljen. Prijavi se.', 409)

  const { data: product, error: productError } = await admin
    .from('products')
    .select('id, price_rsd, duration_days')
    .eq('id', input.product_id)
    .eq('active', true)
    .maybeSingle()
  if (productError) throw productError
  if (!product) throw new HttpError('Izabrani plan nije dostupan', 400)

  // 1. nalog (trigger handle_new_user pravi profil sa ulogom client)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: intake.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: intake.full_name, phone: intake.phone },
  })
  if (createError || !created.user) {
    if (createError?.code === 'email_exists' || createError?.status === 422) {
      throw new HttpError('Nalog sa ovim emailom već postoji. Prijavi se.', 409)
    }
    throw createError ?? new Error('Nalog nije napravljen')
  }
  const userId = created.user.id

  try {
    const channels = ((intake.answers as { channels?: string[] } | null)?.channels ?? []).filter(
      (c) => c === 'whatsapp' || c === 'email',
    )
    await admin
      .from('profiles')
      .update({
        full_name: intake.full_name,
        phone: intake.phone,
        ...(channels.length > 0 ? { preferred_channels: channels } : {}),
      })
      .eq('id', userId)
      .throwOnError()

    // 2. program i uplata
    const { data: program } = await admin
      .from('programs')
      .insert({
        client_id: userId,
        product_id: product.id,
        intake_id: intake.id,
        status: 'awaiting_payment',
        duration_days: product.duration_days,
        exercise_level: intake.exercise_level,
      })
      .select('id')
      .single()
      .throwOnError()

    const paymentId = crypto.randomUUID()
    const checkout = await defaultProvider.createCheckout({
      paymentId,
      programId: program.id,
      amountRsd: product.price_rsd,
      customerEmail: intake.email,
    })
    await admin
      .from('payments')
      .insert({
        id: paymentId,
        program_id: program.id,
        client_id: userId,
        amount_rsd: product.price_rsd,
        provider: checkout.provider,
        provider_ref: checkout.reference,
        status: 'pending',
      })
      .throwOnError()

    // 3. anketa postaje vezana za nalog (od ove tačke nema vraćanja, pa je ovo poslednji korak koji sme da padne)
    const { data: linked } = await admin
      .from('intake_surveys')
      .update({ client_id: userId })
      .eq('id', intake.id)
      .is('client_id', null)
      .select('id')
      .throwOnError()
    if (!linked || linked.length === 0) throw new Error('Anketa je u međuvremenu povezana sa drugim nalogom')

    // 4. nalazi iz ankete prelaze u folder klijenta (greška ovde ne poništava kupovinu)
    const { data: files } = await admin
      .from('lab_files')
      .select('id, storage_path')
      .eq('intake_id', intake.id)
    for (const file of files ?? []) {
      const target = `${userId}/${file.storage_path.split('/').pop()}`
      const { error: moveError } = await admin.storage.from('labs').move(file.storage_path, target)
      if (moveError) {
        console.error('Premeštanje nalaza nije uspelo', file.storage_path, moveError.message)
      }
      await admin
        .from('lab_files')
        .update({ client_id: userId, ...(moveError ? {} : { storage_path: target }) })
        .eq('id', file.id)
    }

    return json({
      program_id: program.id,
      payment_id: paymentId,
      amount_rsd: product.price_rsd,
      instructions: checkout.instructions ?? null,
      redirect_url: checkout.redirectUrl ?? null,
    })
  } catch (error) {
    // Anketa još nije vezana za nalog, pa brisanje naloga (kaskadno profil, program, uplata) ne dira anketu
    console.error('create-checkout nije uspeo, brišem nalog', error)
    await admin.auth.admin.deleteUser(userId)
    throw error
  }
})
