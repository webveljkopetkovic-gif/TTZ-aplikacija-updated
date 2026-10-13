// Webhook procesora kartica: ?provider=<ime>. Verodostojnost proverava provider, a potvrda ide kroz markPaid.
// Dok postoji samo `manual` provider, ova funkcija odbija zahteve (501).
import { adminClient, errorResponse, HttpError, json, serve } from '../_shared/http.ts'
import { markPaid } from '../_shared/markPaid.ts'
import { getProvider } from '../_shared/payments/index.ts'

serve(async (req) => {
  const providerName = new URL(req.url).searchParams.get('provider') ?? ''
  const provider = getProvider(providerName)
  if (!provider || provider.name === 'manual') {
    return errorResponse('Provider ne podržava webhook', 501)
  }

  let event
  try {
    event = await provider.verifyWebhook(req)
  } catch {
    throw new HttpError('Potpis nije ispravan', 401)
  }
  if (event.status !== 'paid') return json({ ok: true, ignored: true })

  const admin = adminClient()
  const { data: payment, error } = await admin
    .from('payments')
    .select('id')
    .eq('provider', provider.name)
    .eq('provider_ref', event.reference)
    .maybeSingle()
  if (error) throw error
  if (!payment) throw new HttpError('Uplata nije pronađena', 404)

  const result = await markPaid(admin, payment.id)
  return json({ ok: true, already_paid: result.alreadyPaid })
})
