/**
 * System prompt, kontekst i alati AI asistenta (PLAN.md 4.6, ANKETA.md sekcija 7). Čiste funkcije bez baze:
 * Edge Function `assistant` čita podatke, ovde se samo slažu. Asistent dobija SAMO polja iz sekcije 7,
 * nikad dijagnoze, terapiju, nalaze ni beleške tima (`team_notes`).
 */
import { z } from 'zod'
import type { ToolDef } from './llmTypes.ts'
import {
  ageFromBirthDate,
  DISLIKED_FOOD_OPTIONS,
  FLUID_OPTIONS,
  labelOf,
  SLEEP_HOURS_OPTIONS,
  STOOL_OPTIONS,
} from './intakeSchema.ts'

export const SLOTS = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'] as const
export type Slot = (typeof SLOTS)[number]

const SLOT_LABEL: Record<Slot, string> = {
  breakfast: 'doručak',
  snack_am: 'jutarnja užina',
  lunch: 'ručak',
  snack_pm: 'popodnevna užina',
  dinner: 'večera',
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'početni',
  intermediate: 'srednji',
  advanced: 'napredni',
}

export type ContextMeal = { slot: Slot; time_of_day: string; title: string }

export type AssistantContext = {
  firstName: string
  sex: 'female' | 'male' | null
  age: number | null
  planFocus: string | null
  allergies: string
  disliked: string
  fluids: string
  stool: string
  sleep: string
  exerciseLevel: string | null
  withTraining: boolean
  day: number
  duration: number
  planDay: number
  cycle: number
  mealsToday: ContextMeal[]
  tomorrowPlanDay: number
  mealsTomorrow: ContextMeal[]
  supplements: { name: string; timing: string }[]
  workouts: string[]
  lastTeamReply: string | null
}

/** Anketa → samo dozvoljena polja (sekcija 7). Ostala polja se ovde namerno ne čitaju. */
export function intakeForAssistant(
  intake: {
    sex?: string | null
    birth_date?: string | null
    answers?: Record<string, unknown> | null
  } | null,
  today?: string,
): Pick<AssistantContext, 'sex' | 'age' | 'allergies' | 'disliked' | 'fluids' | 'stool' | 'sleep'> {
  const a = (intake?.answers ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const label = (options: Parameters<typeof labelOf>[0], v: unknown) => labelOf(options, str(v)) || str(v)
  const disliked = [
    ...(Array.isArray(a.disliked_foods) ? a.disliked_foods : []).map((f) => label(DISLIKED_FOOD_OPTIONS, f)),
    str(a.disliked_other),
  ].filter(Boolean)
  return {
    sex: intake?.sex === 'female' || intake?.sex === 'male' ? intake.sex : null,
    age: intake?.birth_date ? ageFromBirthDate(intake.birth_date, today) : null,
    allergies: a.allergies === true ? str(a.allergies_text) || 'da (bez detalja)' : 'nema',
    disliked: disliked.join(', ') || 'ništa posebno',
    fluids: label(FLUID_OPTIONS, a.fluids) || 'nepoznato',
    stool: label(STOOL_OPTIONS, a.stool) || 'nepoznato',
    sleep: label(SLEEP_HOURS_OPTIONS, a.sleep_hours) || 'nepoznato',
  }
}

/** Obroci za dan plana u krugu: red sa najvećim valid_from_cycle ≤ krug (isto kao src/lib/planMeals.ts). */
export function mealsFor<T extends ContextMeal & { plan_day: number; valid_from_cycle: number }>(
  meals: readonly T[],
  planDay: number,
  cycle: number,
): ContextMeal[] {
  const best = new Map<Slot, T>()
  for (const m of meals) {
    if (m.plan_day !== planDay || m.valid_from_cycle > cycle) continue
    const cur = best.get(m.slot)
    if (!cur || m.valid_from_cycle > cur.valid_from_cycle) best.set(m.slot, m)
  }
  return SLOTS.flatMap((s) => {
    const m = best.get(s)
    return m ? [{ slot: s, time_of_day: m.time_of_day, title: m.title }] : []
  })
}

const mealLines = (meals: ContextMeal[]) =>
  meals.length === 0
    ? '- (nema obroka u planu)'
    : meals.map((m) => `- ${SLOT_LABEL[m.slot]} (${m.slot}, ${m.time_of_day.slice(0, 5)}): ${m.title}`).join('\n')

/** System prompt na srpskom sa pravilima domena i kontekstom klijenta. */
export function buildSystemPrompt(ctx: AssistantContext): string {
  const forms =
    ctx.sex === 'female'
      ? 'Klijentkinja je žensko: koristi ženski rod kad joj se obraćaš (npr. „napisala si“).'
      : ctx.sex === 'male'
        ? 'Klijent je muško: koristi muški rod kad mu se obraćaš (npr. „napisao si“).'
        : ''
  const team = ctx.withTraining
    ? 'Tim: Olgica (ishrana i suplementi) i Ognjen (vežbe).'
    : 'Tim: Olgica (ishrana i suplementi). Klijent nema program vežbi.'

  return `Ti si asistent aplikacije „TTZ – Tvoj tim zdravlja“. Odgovaraš klijentu odmah, a tim proverava.
${team}

PRAVILA (obavezna, bez izuzetka):
1. Piši isključivo na srpskom, latinicom. Kratko: najviše 3–4 rečenice. Obraćaj se sa „ti“. ${forms}
2. NIKAD ne pominji brojeve kalorija, grame, mililitre hrane, makronutrijente ni vaganje i merenje porcija. Ako klijent pita za kalorije ili grame, objasni da u TTZ programu ne brojimo kalorije i ne merimo hranu, već pratimo plan obroka.
3. Ne postavljaš dijagnoze, ne menjaš terapiju ni doze lekova i ne uvodiš nove suplemente. Za lekove i terapiju upućuješ na lekara, a za suplemente na Olgicu.
4. Ozbiljni simptomi (bol u grudima, nesvestica, krv, jak bol, trudnoća, alergijska reakcija, otežano disanje): savetuj da se odmah javi lekaru ili hitnoj pomoći (194) i pozovi alat escalate_to_team sa urgency "high".
5. Plan ne menjaš sam. Zamenu obroka predlažeš alatom propose_meal_swap${ctx.withTraining ? ', a zamenu vežbe alatom propose_workout_swap' : ''}. Posle predloga jasno reci da zamena važi tek kad je tim potvrdi (${ctx.withTraining ? 'Olgica za ishranu, Ognjen za vežbe' : 'Olgica'}).
6. Zamena obroka mora da poštuje alergije i hranu koju klijent ne voli. Naslov novog obroka je kratak opis bez količina.
7. Ako nešto ne znaš ili pitanje nije za tebe (posao, lični problemi, nalazi), reci da ćeš proslediti timu i pozovi escalate_to_team sa urgency "normal".
8. Tim ne zove klijente telefonom. Odgovori tima stižu porukom (aplikacija, WhatsApp ili email).

KLIJENT
ime: ${ctx.firstName}
starost: ${ctx.age ?? 'nepoznato'}
fokus plana: ${ctx.planFocus ?? 'opšte zdravlje'}
alergije: ${ctx.allergies}
ne voli: ${ctx.disliked}
tečnost dnevno: ${ctx.fluids}
stolica: ${ctx.stool}
san: ${ctx.sleep}${ctx.withTraining ? `\nnivo vežbi: ${LEVEL_LABEL[ctx.exerciseLevel ?? ''] ?? 'početni'}` : ''}

PROGRAM
dan_programa: ${ctx.day} od ${ctx.duration}
plan_dan_danas: ${ctx.planDay} (plan ishrane ima 14 dana, ovo je krug ${ctx.cycle})
plan_dan_sutra: ${ctx.tomorrowPlanDay}

Obroci danas (plan dan ${ctx.planDay}):
${mealLines(ctx.mealsToday)}

Obroci sutra (plan dan ${ctx.tomorrowPlanDay}):
${mealLines(ctx.mealsTomorrow)}

Suplementi: ${ctx.supplements.length ? ctx.supplements.map((s) => `${s.name} (${s.timing})`).join(', ') : 'nema'}${
    ctx.withTraining ? `\nVideo treninzi za nivo: ${ctx.workouts.length ? ctx.workouts.join(', ') : 'nema'}` : ''
  }

Poslednji odgovor tima: ${ctx.lastTeamReply ?? 'nema'}`
}

// ===================== ALATI =====================
export const mealSwapArgs = z.object({
  plan_day: z.coerce.number().int().min(1).max(14),
  slot: z.enum(SLOTS),
  new_title: z.string().trim().min(2).max(120),
  reason: z.string().trim().max(300).default(''),
})

export const workoutSwapArgs = z.object({
  exercise: z.string().trim().min(2).max(120),
  replacement: z.string().trim().min(2).max(160),
  reason: z.string().trim().max(300).default(''),
})

export const escalateArgs = z.object({
  reason: z.string().trim().min(2).max(300),
  urgency: z.enum(['normal', 'high']).catch('normal'),
})

/** Alati koje model sme da pozove; zamena vežbe samo za plan sa vežbama. */
export function assistantTools(withTraining: boolean): ToolDef[] {
  const tools: ToolDef[] = [
    {
      type: 'function',
      function: {
        name: 'propose_meal_swap',
        description:
          'Predlaže timu zamenu jednog obroka u planu. Ne menja plan odmah: važi tek kad Olgica potvrdi.',
        parameters: {
          type: 'object',
          properties: {
            plan_day: { type: 'integer', minimum: 1, maximum: 14, description: 'Dan plana ishrane (1–14)' },
            slot: { type: 'string', enum: [...SLOTS], description: 'Obrok u danu' },
            new_title: { type: 'string', description: 'Kratak naziv novog obroka, bez količina' },
            reason: { type: 'string', description: 'Zašto klijent traži zamenu' },
          },
          required: ['plan_day', 'slot', 'new_title', 'reason'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'escalate_to_team',
        description:
          'Prosleđuje pitanje timu: ozbiljni simptomi (urgency high) ili pitanje na koje asistent ne sme ili ne zna da odgovori.',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Kratko: šta tim treba da pogleda' },
            urgency: { type: 'string', enum: ['normal', 'high'] },
          },
          required: ['reason', 'urgency'],
        },
      },
    },
  ]
  if (withTraining) {
    tools.splice(1, 0, {
      type: 'function',
      function: {
        name: 'propose_workout_swap',
        description: 'Predlaže timu zamenu vežbe koja klijentu ne prija. Važi tek kad Ognjen potvrdi.',
        parameters: {
          type: 'object',
          properties: {
            exercise: { type: 'string', description: 'Vežba koja ne prija' },
            replacement: { type: 'string', description: 'Predlog zamene' },
            reason: { type: 'string', description: 'Zašto (npr. smeta kolenu)' },
          },
          required: ['exercise', 'replacement', 'reason'],
        },
      },
    })
  }
  return tools
}

export type ProposedAction =
  | { type: 'meal_swap'; plan_day: number; slot: Slot; title: string; reason: string }
  | { type: 'workout_swap'; exercise: string; replacement: string; reason: string }
  | { type: 'escalation'; reason: string; urgency: 'normal' | 'high' }

/** Ako ih ima više u jednom odgovoru, čuva se najvažniji: eskalacija > obrok > vežba. */
export function pickAction(actions: ProposedAction[]): ProposedAction | null {
  const rank = { escalation: 0, meal_swap: 1, workout_swap: 2 } as const
  return [...actions].sort((a, b) => rank[a.type] - rank[b.type])[0] ?? null
}
