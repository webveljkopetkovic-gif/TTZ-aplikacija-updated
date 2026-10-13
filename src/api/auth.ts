import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const sessionKey = ['session'] as const
const profileKey = (userId: string | undefined) => ['profile', userId] as const

/** Jednom u App-u: drži sesiju u TanStack Query kešu u skladu sa Supabase Auth događajima. */
export function useAuthListener() {
  const qc = useQueryClient()
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      qc.setQueryData(sessionKey, session)
      void qc.invalidateQueries({ queryKey: ['profile'] })
    })
    return () => data.subscription.unsubscribe()
  }, [qc])
}

export function useSession() {
  return useQuery<Session | null>({
    queryKey: sessionKey,
    queryFn: async () => (await supabase.auth.getSession()).data.session,
    staleTime: Infinity,
  })
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, email')
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useSignIn() {
  return useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword(values)
      if (error) throw error
    },
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => qc.clear(),
  })
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nova-lozinka`,
      })
      if (error) throw error
    },
  })
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  })
}
