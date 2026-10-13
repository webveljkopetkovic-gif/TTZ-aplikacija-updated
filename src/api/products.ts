import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Product {
  id: string
  kind: 'nutrition' | 'nutrition_training'
  name: string
  price_rsd: number
  duration_days: number
}

/** Aktivni planovi za prodaju (anon ih čita, RLS dozvoljava samo `active`). */
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, kind, name, price_rsd, duration_days')
        .eq('active', true)
        .order('price_rsd')
      if (error) throw error
      return data
    },
  })
}

/** 12900 → „12.900 RSD“ */
export function formatRsd(amount: number): string {
  return `${new Intl.NumberFormat('sr-Latn-RS').format(amount)} RSD`
}
