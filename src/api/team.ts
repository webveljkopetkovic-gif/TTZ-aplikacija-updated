import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { invokeFunction } from './functions'

type Slot = Database['public']['Enums']['meal_slot']
type Level = Database['public']['Enums']['exercise_level']

export const SLOTS: { value: Slot; label: string; time: string }[] = [
  { value: 'breakfast', label: 'Doručak', time: '08:00' },
  { value: 'snack_am', label: 'Užina pre podne', time: '11:00' },
  { value: 'lunch', label: 'Ručak', time: '14:00' },
  { value: 'snack_pm', label: 'Užina popodne', time: '16:30' },
  { value: 'dinner', label: 'Večera', time: '19:30' },
]

// ===================== PREGLED I DOSIJEI =====================
/** Pregled klijenata za tim (view team_client_overview, PLAN.md 4.8). */
export function useTeamOverview() {
  return useQuery({
    queryKey: ['team-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_client_overview')
        .select('*')
        .order('full_name')
      if (error) throw error
      return data ?? []
    },
  })
}
export type OverviewRow = NonNullable<ReturnType<typeof useTeamOverview>['data']>[number]

export function useClientProfile(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-profile', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, preferred_channels, created_at')
        .eq('id', clientId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Najnoviji program klijenta sa anketom i proizvodom. */
export function useClientProgram(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-program', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select(
          `id, status, duration_days, plan_focus, exercise_level, training_weekdays, meal_template_id,
           paid_at, plan_ready_at, activated_at, created_at,
           products ( name, kind ),
           intake_surveys ( id, full_name, email, phone, birth_date, sex, occupation, country, height_cm,
                            start_weight_kg, activity_level, exercise_level, answers, schema_version, submitted_at )`,
        )
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
export type ClientProgram = NonNullable<ReturnType<typeof useClientProgram>['data']>

export function useClientLabFiles(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-labs', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_files')
        .select('id, storage_path, label, uploaded_at')
        .eq('client_id', clientId!)
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Nalaz se otvara preko kratkotrajnog potpisanog linka (bucket je privatan). */
export async function openLabFile(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from('labs').createSignedUrl(path, 60)
  if (error || !data) throw new Error('Nalaz se ne može otvoriti')
  window.open(data.signedUrl, '_blank', 'noopener')
}

/** Raniji programi klijenta (karton): sve osim najnovijeg. */
export function useClientPastPrograms(
  clientId: string | undefined,
  currentProgramId: string | undefined,
) {
  return useQuery({
    queryKey: ['client-past-programs', clientId, currentProgramId],
    enabled: !!clientId && !!currentProgramId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, status, activated_at, duration_days, products ( name )')
        .eq('client_id', clientId!)
        .neq('id', currentProgramId!)
        .not('activated_at', 'is', null)
        .order('activated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useClientMeasurements(programId: string | undefined) {
  return useQuery({
    queryKey: ['client-measurements', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurements')
        .select('program_day, weight_kg, waist_cm, energy_am')
        .eq('program_id', programId!)
        .order('program_day')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useClientFeedbacks(programId: string | undefined) {
  return useQuery({
    queryKey: ['client-feedbacks', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id, due_day, status, submitted_at, feedback_replies ( body, sent_at, created_at )')
        .eq('program_id', programId!)
        .in('status', ['open', 'submitted', 'late', 'answered'])
        .order('due_day', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useTeamNotes(clientId: string | undefined) {
  return useQuery({
    queryKey: ['team-notes', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_notes')
        .select('id, body, created_at, profiles!team_notes_author_id_fkey ( full_name )')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddTeamNote(clientId: string | undefined, authorId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from('team_notes')
        .insert({ client_id: clientId!, author_id: authorId!, body })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-notes', clientId] }),
  })
}

// ===================== IZRADA PLANA =====================
export function useMealTemplates() {
  return useQuery({
    queryKey: ['meal-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_templates')
        .select('id, name, condition, created_at')
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

/** Obroci kruga 1 (osnova plana), po danu i obroku. */
export function useProgramMeals(programId: string | undefined) {
  return useQuery({
    queryKey: ['program-meals', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_meals')
        .select('id, plan_day, slot, time_of_day, title, description, recipe, ingredients, valid_from_cycle')
        .eq('program_id', programId!)
        .eq('valid_from_cycle', 1)
        .order('plan_day')
        .order('time_of_day')
      if (error) throw error
      return data ?? []
    },
  })
}
export type ProgramMeal = NonNullable<ReturnType<typeof useProgramMeals>['data']>[number]

export function useApplyTemplate(programId: string | undefined, clientId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.rpc('apply_meal_template', {
        p_program_id: programId!,
        p_template_id: templateId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['program-meals', programId] })
      void qc.invalidateQueries({ queryKey: ['client-program', clientId] })
    },
  })
}

export function useSaveMeal(programId: string | undefined, authorId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (meal: {
      plan_day: number
      slot: Slot
      time_of_day: string
      title: string
      description: string
      recipe: string
      ingredients: string
    }) => {
      const { error } = await supabase.from('program_meals').upsert(
        {
          program_id: programId!,
          valid_from_cycle: 1,
          created_by: authorId!,
          ...meal,
          description: meal.description || null,
          recipe: meal.recipe || null,
          ingredients: meal.ingredients || null,
        },
        { onConflict: 'program_id,plan_day,slot,valid_from_cycle' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-meals', programId] }),
  })
}

export function useSupplements(programId: string | undefined) {
  return useQuery({
    queryKey: ['supplements', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplements')
        .select('id, name, timing, note')
        .eq('program_id', programId!)
        .eq('active', true)
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddSupplement(programId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: { name: string; timing: string; note?: string }) => {
      const { error } = await supabase
        .from('supplements')
        .insert({ program_id: programId!, name: s.name, timing: s.timing, note: s.note || null })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplements', programId] }),
  })
}

export function useRemoveSupplement(programId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supplements').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplements', programId] }),
  })
}

/** Nivo vežbi, dani treninga i fokus plana (Olgica: fokus, Ognjen: vežbe). */
export function useUpdateProgram(programId: string | undefined, clientId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: {
      exercise_level?: Level
      training_weekdays?: number[]
      plan_focus?: string | null
    }) => {
      const { error } = await supabase.from('programs').update(patch).eq('id', programId!)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-program', clientId] }),
  })
}

/** „Pošalji plan“: Edge Function publish-plan (status 'ready' + poruka klijentu). */
export function usePublishPlan(clientId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (programId: string) =>
      invokeFunction<{ already_published: boolean }>('publish-plan', { program_id: programId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['client-program', clientId] })
      void qc.invalidateQueries({ queryKey: ['team-overview'] })
    },
  })
}

// ===================== MATERIJALI =====================
export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, level, title, duration_min, video_url, description, sort_order')
        .order('level')
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSaveWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (w: {
      id?: string
      level: Level
      title: string
      duration_min: number
      video_url: string
      description: string
    }) => {
      const { id, ...rest } = w
      const row = { ...rest, description: rest.description || null }
      const { error } = id
        ? await supabase.from('workouts').update(row).eq('id', id)
        : await supabase.from('workouts').insert(row)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useTemplateItems(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-items', templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_template_items')
        .select('id, plan_day, slot, time_of_day, title, description, recipe, ingredients')
        .eq('template_id', templateId!)
        .order('plan_day')
        .order('time_of_day')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateTemplate(authorId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: { name: string; condition: string }) => {
      const { data, error } = await supabase
        .from('meal_templates')
        .insert({ name: t.name, condition: t.condition || null, created_by: authorId! })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-templates'] }),
  })
}

export function useSaveTemplateItem(templateId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: {
      plan_day: number
      slot: Slot
      time_of_day: string
      title: string
      description: string
      recipe: string
      ingredients: string
    }) => {
      const { error } = await supabase.from('meal_template_items').upsert(
        {
          template_id: templateId!,
          ...item,
          description: item.description || null,
          recipe: item.recipe || null,
          ingredients: item.ingredients || null,
        },
        { onConflict: 'template_id,plan_day,slot' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-items', templateId] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-templates'] }),
  })
}
