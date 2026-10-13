import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeFunction } from './functions'

export interface CheckoutResult {
  program_id: string
  payment_id: string
  amount_rsd: number
  instructions: { amountRsd: number; reference: string; note: string } | null
  redirect_url: string | null
}

/** „Plati i aktiviraj plan“: pravi nalog + program + uplatu, pa prijavljuje klijenta. */
export function useCheckout() {
  return useMutation({
    mutationFn: async (input: {
      intakeId: string
      email: string
      password: string
      productId: string
    }): Promise<CheckoutResult> => {
      const result = await invokeFunction<CheckoutResult>('create-checkout', {
        intake_id: input.intakeId,
        email: input.email,
        password: input.password,
        product_id: input.productId,
        consent: true,
      })
      const { error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })
      if (error) throw error
      return result
    },
  })
}
