import { useProfile, useSession } from '@/api/auth'
import { useCurrentProgram } from '@/api/programs'
import { belgradeDate, planCycle, planDay, programDay } from '@/lib/programDay'

/**
 * Program prijavljenog klijenta sa izvedenim danima. Dan programa, dan plana i krug se računaju
 * samo kroz src/lib/programDay.ts (jedan izvor istine).
 */
export function useMyProgram() {
  const session = useSession()
  const userId = session.data?.user.id
  const profile = useProfile(userId)
  const query = useCurrentProgram(userId)
  const program = query.data ?? null

  const today = belgradeDate()
  const day = program ? programDay(program.activated_at, today) : 0

  return {
    userId,
    profile: profile.data,
    program,
    isPending: session.isPending || query.isPending,
    isError: query.isError,
    today,
    day,
    planDay: planDay(day),
    cycle: planCycle(day),
    duration: program?.duration_days ?? 30,
    withTraining: program?.products?.kind === 'nutrition_training',
    trainingWeekdays: program?.training_weekdays ?? [],
  }
}
