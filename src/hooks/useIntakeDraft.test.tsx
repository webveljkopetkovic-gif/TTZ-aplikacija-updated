import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { INTAKE_DRAFT_KEY } from '@/lib/intakeDraft'
import { useIntakeDraft } from './useIntakeDraft'

beforeEach(() => localStorage.clear())

describe('useIntakeDraft', () => {
  it('čuva izmenu u localStorage odmah posle svake promene', () => {
    const { result } = renderHook(() => useIntakeDraft())
    act(() => {
      result.current.update({ full_name: 'Ana' })
    })
    expect(JSON.parse(localStorage.getItem(INTAKE_DRAFT_KEY)!).values.full_name).toBe('Ana')
    expect(result.current.draft.values.full_name).toBe('Ana')
  })

  it('dva uzastopna poziva ne gube izmene', () => {
    const { result } = renderHook(() => useIntakeDraft())
    act(() => {
      result.current.update({ full_name: 'Ana' })
      result.current.update({ occupation: 'Pravnica' })
    })
    expect(result.current.draft.values).toMatchObject({ full_name: 'Ana', occupation: 'Pravnica' })
  })

  it('vraća nacrt posle ponovnog otvaranja (osvežavanje stranice)', () => {
    const first = renderHook(() => useIntakeDraft())
    act(() => {
      first.result.current.update({ country: 'Hrvatska' })
    })
    first.unmount()

    const second = renderHook(() => useIntakeDraft())
    expect(second.result.current.draft.values.country).toBe('Hrvatska')
    expect(second.result.current.draft.intakeId).toBe(first.result.current.draft.intakeId)
  })

  it('clear briše odgovore i pravi novi intake_id', () => {
    const { result } = renderHook(() => useIntakeDraft())
    const before = result.current.draft.intakeId
    act(() => {
      result.current.update({ full_name: 'Ana' })
    })
    act(() => result.current.clear())
    expect(result.current.draft.values).toEqual({})
    expect(result.current.draft.intakeId).not.toBe(before)
  })
})
