import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { Slot } from '@/lib/planMeals'
import { invokeFunction } from './functions'

type Level = Database['public']['Enums']['exercise_level']
type Channel = Database['public']['Enums']['msg_channel']

// ===================== PLAN ISHRANE I OBROCI =====================
/** Svi obroci programa (svi krugovi); koji važi za dan bira mealsForDay (src/lib/planMeals.ts). */
export function useProgramMeals(programId: string | undefined) {
  return useQuery({
    queryKey: ['my-meals', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_meals')
        .select('plan_day, slot, time_of_day, title, description, recipe, valid_from_cycle')
        .eq('program_id', programId!)
      if (error) throw error
      return (data ?? []).map((m) => ({ ...m, slot: m.slot as Slot }))
    },
  })
}

/** Štiklirani obroci za dan programa (skup slotova). */
export function useMealLogs(programId: string | undefined, day: number) {
  return useQuery({
    queryKey: ['meal-logs', programId, day],
    enabled: !!programId && day > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('slot')
        .eq('program_id', programId!)
        .eq('program_day', day)
      if (error) throw error
      return new Set((data ?? []).map((l) => l.slot as string))
    },
  })
}

export function useToggleMeal(programId: string | undefined, day: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slot, done }: { slot: Slot; done: boolean }) => {
      const table = supabase.from('meal_logs')
      const { error } = done
        ? await table.upsert(
            { program_id: programId!, program_day: day, slot },
            { onConflict: 'program_id,program_day,slot' },
          )
        : await table.delete().eq('program_id', programId!).eq('program_day', day).eq('slot', slot)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['meal-logs', programId, day] })
      void qc.invalidateQueries({ queryKey: ['meal-log-days', programId] })
    },
  })
}

/** Dani u kojima je klijent štiklirao bar jedan obrok („plan praćen x/y d“). */
export function useMealLogDays(programId: string | undefined) {
  return useQuery({
    queryKey: ['meal-log-days', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('program_day')
        .eq('program_id', programId!)
      if (error) throw error
      return new Set((data ?? []).map((l) => l.program_day))
    },
  })
}

// ===================== SUPLEMENTI I NALAZI =====================
export function useMySupplements(programId: string | undefined) {
  return useQuery({
    queryKey: ['my-supplements', programId],
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

export function useSupplementLogs(programId: string | undefined, day: number) {
  return useQuery({
    queryKey: ['supplement-logs', programId, day],
    enabled: !!programId && day > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplement_logs')
        .select('supplement_id')
        .eq('program_id', programId!)
        .eq('program_day', day)
      if (error) throw error
      return new Set((data ?? []).map((l) => l.supplement_id))
    },
  })
}

export function useToggleSupplement(programId: string | undefined, day: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taken }: { id: string; taken: boolean }) => {
      const table = supabase.from('supplement_logs')
      const { error } = taken
        ? await table.upsert(
            { program_id: programId!, supplement_id: id, program_day: day },
            { onConflict: 'supplement_id,program_day' },
          )
        : await table.delete().eq('supplement_id', id).eq('program_day', day)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplement-logs', programId, day] }),
  })
}

export function useMyLabFiles(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-labs', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_files')
        .select('id, storage_path, label, uploaded_at')
        .eq('client_id', userId!)
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ===================== VEŽBE =====================
export function useWorkoutsForLevel(level: Level | null | undefined) {
  return useQuery({
    queryKey: ['workouts-level', level],
    enabled: !!level,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, level, title, duration_min, video_url, description, sort_order')
        .eq('level', level!)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useWorkout(id: string | undefined) {
  return useQuery({
    queryKey: ['workout', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, level, title, duration_min, video_url, description')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useWorkoutLogs(programId: string | undefined) {
  return useQuery({
    queryKey: ['workout-logs', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('id, workout_id, program_day, duration_min, completed_at')
        .eq('program_id', programId!)
        .order('completed_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useLogWorkout(programId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: {
      workout_id: string
      program_day: number
      duration_min: number | null
    }) => {
      const { error } = await supabase
        .from('workout_logs')
        .insert({ program_id: programId!, ...log })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-logs', programId] }),
  })
}

// ===================== MERENJA I SLIKE =====================
export function useMyMeasurements(programId: string | undefined) {
  return useQuery({
    queryKey: ['my-measurements', programId],
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

export function useSaveMeasurement(programId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: {
      program_day: number
      weight_kg: number | null
      waist_cm: number | null
    }) => {
      const { error } = await supabase
        .from('measurements')
        .upsert({ program_id: programId!, ...m }, { onConflict: 'program_id,program_day' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-measurements', programId] }),
  })
}

const PHOTO_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

/** Slika u privatni bucket `photos/<client_id>/…` i red u progress_photos. */
export async function uploadProgressPhoto(
  userId: string,
  programId: string,
  day: number,
  angle: 'front' | 'side',
  file: File,
): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const type = file.type || PHOTO_TYPES[extension]
  if (!type || !(extension in PHOTO_TYPES)) throw new Error('Dozvoljeni su JPG, PNG, WEBP i HEIC')
  if (file.size > 10 * 1024 * 1024) throw new Error('Slika je veća od 10 MB')

  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const upload = await supabase.storage.from('photos').upload(path, file, { contentType: type })
  if (upload.error) throw new Error('Slanje slike nije uspelo. Pokušaj ponovo.')

  const { error } = await supabase
    .from('progress_photos')
    .insert({ program_id: programId, program_day: day, angle, storage_path: path })
  if (error) throw error
}

/** Slike sa kratkotrajnim potpisanim linkovima (bucket je privatan). */
export function useProgressPhotos(programId: string | undefined) {
  return useQuery({
    queryKey: ['progress-photos', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('id, program_day, angle, storage_path')
        .eq('program_id', programId!)
        .order('program_day')
      if (error) throw error
      const rows = data ?? []
      if (rows.length === 0) return []
      const signed = await supabase.storage.from('photos').createSignedUrls(
        rows.map((r) => r.storage_path),
        3600,
      )
      return rows.map((r, i) => ({ ...r, url: signed.data?.[i]?.signedUrl ?? null }))
    },
  })
}

export function useUploadPhoto(userId: string | undefined, programId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { day: number; angle: 'front' | 'side'; file: File }) =>
      uploadProgressPhoto(userId!, programId!, v.day, v.angle, v.file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress-photos', programId] }),
  })
}

// ===================== PODSETNICI, KANALI, AKTIVACIJA =====================
export interface Reminders {
  meals: boolean
  supplements: boolean
  workouts: boolean
}

export function useReminderSettings(userId: string | undefined) {
  return useQuery({
    queryKey: ['reminder-settings', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Reminders & { workout_time: string }> => {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('meals, supplements, workouts, workout_time')
        .eq('client_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data ?? { meals: true, supplements: true, workouts: true, workout_time: '18:00:00' }
    },
  })
}

export function useMyChannels(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-channels', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Channel[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_channels')
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data.preferred_channels
    },
  })
}

/** Podsetnici i kanali iz koraka 3 na ekranu Dan 1. */
export async function saveStartSettings(
  userId: string,
  reminders: Reminders,
  channels: Channel[],
): Promise<void> {
  const r = await supabase
    .from('reminder_settings')
    .upsert({ client_id: userId, ...reminders }, { onConflict: 'client_id' })
  if (r.error) throw r.error
  const p = await supabase
    .from('profiles')
    .update({ preferred_channels: channels })
    .eq('id', userId)
  if (p.error) throw p.error
}

/** „Sačuvaj i kreni“: Edge Function activate-program (activated_at = danas po Beogradu). */
export function useActivateProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (programId: string) =>
      invokeFunction<{ activated_at: string }>('activate-program', { program_id: programId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program'] }),
  })
}
