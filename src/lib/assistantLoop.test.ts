import { describe, expect, it, vi } from 'vitest'
import type { Completion, ToolCall } from '../../supabase/functions/_shared/llmTypes'
import { runAssistantTurn, type Completer } from './assistantLoop'

const text = (content: string): Completion => ({
  content,
  toolCalls: [],
  inputTokens: 100,
  outputTokens: 20,
})

const tool = (name: string, args: Record<string, unknown>): Completion => ({
  content: '',
  toolCalls: [
    { id: `c-${name}`, type: 'function', function: { name, arguments: JSON.stringify(args) } } as ToolCall,
  ],
  inputTokens: 100,
  outputTokens: 10,
})

/** Lažni model: vraća zadate odgovore redom. */
function scripted(...answers: (Completion | Error)[]) {
  const fn = vi.fn<Completer>(async () => {
    const next = answers.shift()
    if (!next) throw new Error('nema više odgovora')
    if (next instanceof Error) throw next
    return next
  })
  return fn
}

const turn = (complete: Completer, question = 'Pitanje', withTraining = true) =>
  runAssistantTurn({ complete, system: 'system', history: [], question, withTraining })

describe('krug razgovora sa asistentom', () => {
  it('alat pa tekst: predlog zamene, dva poziva, zbir tokena', async () => {
    const complete = scripted(
      tool('propose_meal_swap', { plan_day: 3, slot: 'lunch', new_title: 'Ćuretina sa povrćem', reason: 'Ne voli ribu' }),
      text('Predložio sam ćuretinu. Važi kad Olgica potvrdi.'),
    )
    const r = await turn(complete, 'Ne volim ribu')
    expect(r.outcome).toBe('ok')
    expect(r.action).toEqual({
      type: 'meal_swap',
      plan_day: 3,
      slot: 'lunch',
      title: 'Ćuretina sa povrćem',
      reason: 'Ne voli ribu',
    })
    expect(r.calls).toBe(2)
    expect(r.inputTokens).toBe(200)
    // drugi poziv dobija rezultat alata
    const second = complete.mock.calls[1][0]
    expect(second.at(-1)).toMatchObject({ role: 'tool', tool_call_id: 'c-propose_meal_swap' })
  })

  it('zamena sa gramima ne prolazi: model dobija grešku, predloga nema', async () => {
    const complete = scripted(
      tool('propose_meal_swap', { plan_day: 3, slot: 'lunch', new_title: 'Piletina 150 g', reason: '' }),
      text('Javiću timu.'),
    )
    const r = await turn(complete)
    expect(r.action).toBeNull()
    expect(complete.mock.calls[1][0].at(-1)).toMatchObject({ content: expect.stringMatching(/^Greška/) })
  })

  it('zamena vežbe se ne prihvata kad plan nema vežbe', async () => {
    const complete = scripted(
      tool('propose_workout_swap', { exercise: 'Čučanj', replacement: 'Most', reason: '' }),
      text('U redu.'),
    )
    const r = await turn(complete, 'Vežba mi ne prija', false)
    expect(r.action).toBeNull()
    expect(complete.mock.calls[0][1].map((t) => t.function.name)).not.toContain('propose_workout_swap')
  })

  it('kalorije u odgovoru: jedan ponovni pokušaj bez alata', async () => {
    const complete = scripted(text('Ručak ima 450 kcal.'), text('U TTZ programu ne brojimo kalorije.'))
    const r = await turn(complete, 'Koliko kalorija ima ručak?')
    expect(r.outcome).toBe('retried')
    expect(r.reply).toBe('U TTZ programu ne brojimo kalorije.')
    expect(r.model.violation).toBe('Broj kalorija')
    expect(complete.mock.calls[1][1]).toEqual([])
  })

  it('dva puta loše: bezbedan šablon i eskalacija', async () => {
    const complete = scripted(text('150 g piletine'), text('Ipak 150 g'))
    const r = await turn(complete)
    expect(r.outcome).toBe('fallback')
    expect(r.action).toMatchObject({ type: 'escalation', urgency: 'normal' })
  })

  it('model nedostupan: šablon i eskalacija, bez izuzetka', async () => {
    const r = await turn(scripted(new Error('timeout')))
    expect(r.outcome).toBe('error')
    expect(r.model.error).toBe('timeout')
    expect(r.action?.type).toBe('escalation')
  })

  it('bol u grudima: savet za lekara i hitna eskalacija i kad model to propusti', async () => {
    const r = await turn(scripted(text('Odmori se malo.')), 'Boli me u grudima')
    expect(r.reply).toMatch(/lekar/)
    expect(r.action).toEqual({ type: 'escalation', reason: 'Bol u grudima', urgency: 'high' })
  })
})
