import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RevenueRow } from '@/lib/partnerRevenue'

/** Prihodi po mesecu i vrsti plana. Jedini podaci koje partner sme da vidi (RPC proverava ulogu). */
export function usePartnerRevenue() {
  return useQuery({
    queryKey: ['partner-revenue'],
    queryFn: async (): Promise<RevenueRow[]> => {
      const { data, error } = await supabase.rpc('get_partner_revenue')
      if (error) throw error
      return data ?? []
    },
  })
}
