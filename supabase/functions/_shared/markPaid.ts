import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from './http.ts'

export interface MarkPaidResult {
  paymentId: string
  programId: string
  /** True kad je uplata već bila potvrđena (drugi klik, ponovljen webhook). */
  alreadyPaid: boolean
}

/**
 * Zajednička logika potvrde uplate za admin dugme i webhook procesora (PLAN.md 7.1).
 * Idempotentna: uplata postaje `paid`, a program `building_plan` (dan 0). Ponovljen poziv ništa ne menja,
 * a ako je prethodni pao posle prvog koraka, drugi korak se dovršava.
 */
export async function markPaid(admin: SupabaseClient, paymentId: string): Promise<MarkPaidResult> {
  const { data: payment, error } = await admin
    .from('payments')
    .select('id, program_id, status')
    .eq('id', paymentId)
    .maybeSingle()
  if (error) throw error
  if (!payment) throw new HttpError('Uplata nije pronađena', 404)
  if (payment.status === 'refunded' || payment.status === 'failed') {
    throw new HttpError('Uplata je otkazana ili vraćena i ne može se potvrditi', 409)
  }

  const alreadyPaid = payment.status === 'paid'
  const paidAt = new Date().toISOString()

  if (!alreadyPaid) {
    const { error: payError } = await admin
      .from('payments')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', paymentId)
      .neq('status', 'paid')
    if (payError) throw payError
  }

  // Program prelazi u dan 0 samo iz awaiting_payment, pa ponovljen poziv ne vraća napredniji status
  const { error: programError } = await admin
    .from('programs')
    .update({ status: 'building_plan', paid_at: paidAt })
    .eq('id', payment.program_id)
    .eq('status', 'awaiting_payment')
  if (programError) throw programError

  return { paymentId, programId: payment.program_id, alreadyPaid }
}
