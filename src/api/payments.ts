import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeFunction } from './functions'

/** Uplate za admin pregled (/tim/uplate): prvo one na čekanju, pa poslednje potvrđene. */
export function usePayments() {
  return useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(
          `id, amount_rsd, provider, provider_ref, status, paid_at, created_at,
           profiles ( full_name, email ),
           programs ( products ( name ) )`,
        )
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}

export type AdminPayment = NonNullable<ReturnType<typeof usePayments>['data']>[number]

/** „Uplata primljena“: Edge Function confirm-payment (samo admin, idempotentno). */
export function useConfirmPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) =>
      invokeFunction<{ already_paid: boolean }>('confirm-payment', { payment_id: paymentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }),
  })
}
