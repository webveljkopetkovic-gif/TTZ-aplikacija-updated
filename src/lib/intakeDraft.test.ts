import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearDraft,
  INTAKE_DRAFT_KEY,
  loadDraft,
  loadPending,
  mergeDraft,
  savePending,
  saveDraft,
} from './intakeDraft'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('nacrt ankete', () => {
  it('počinje praznim nacrtom sa stabilnim intake_id', () => {
    const first = loadDraft()
    const second = loadDraft()
    expect(first.values).toEqual({})
    expect(first.intakeId).toMatch(/^[0-9a-f-]{36}$/)
    expect(second.intakeId).toBe(first.intakeId)
  })

  it('čuva se pod ključem ttz_intake_draft_v1 i vraća', () => {
    const draft = mergeDraft(loadDraft(), { full_name: 'Ana Marković', sex: 'female' })
    saveDraft(draft)
    expect(localStorage.getItem('ttz_intake_draft_v1')).not.toBeNull()
    expect(INTAKE_DRAFT_KEY).toBe('ttz_intake_draft_v1')
    expect(loadDraft().values).toMatchObject({ full_name: 'Ana Marković', sex: 'female' })
  })

  it('u nacrtu su samo reference na fajlove, nikad sadržaj fajla', () => {
    const ref = { path: 'intake/x/a.pdf', name: 'a.pdf', size: 1200, type: 'application/pdf' }
    saveDraft(mergeDraft(loadDraft(), { lab_files: [ref] }))
    const raw = JSON.parse(localStorage.getItem(INTAKE_DRAFT_KEY)!)
    expect(raw.values.lab_files).toEqual([ref])
    expect(Object.keys(raw.values.lab_files[0]).sort()).toEqual(['name', 'path', 'size', 'type'])
  })

  it('briše uslovna polja čiji uslov više ne važi', () => {
    let draft = mergeDraft(loadDraft(), {
      sex: 'female',
      pregnancies: '2',
      allergies: true,
      allergies_text: 'Orasi',
    })
    expect(draft.values).toMatchObject({ pregnancies: '2', allergies_text: 'Orasi' })

    draft = mergeDraft(draft, { sex: 'male', allergies: false })
    expect(draft.values).not.toHaveProperty('pregnancies')
    expect(draft.values).not.toHaveProperty('allergies_text')
  })

  it('clearDraft briše nacrt', () => {
    saveDraft(mergeDraft(loadDraft(), { full_name: 'Ana' }))
    clearDraft()
    expect(localStorage.getItem(INTAKE_DRAFT_KEY)).toBeNull()
  })

  it('oštećen nacrt se zamenjuje praznim', () => {
    localStorage.setItem(INTAKE_DRAFT_KEY, '{ovo nije json')
    expect(loadDraft().values).toEqual({})
    localStorage.setItem(INTAKE_DRAFT_KEY, JSON.stringify({ intakeId: 5, values: null }))
    expect(loadDraft().values).toEqual({})
  })
})

describe('podaci za ekran izbora plana', () => {
  it('važe samo za istu anketu', () => {
    savePending({ intakeId: 'a', email: 'ana@primer.rs' })
    expect(loadPending('a')).toEqual({ intakeId: 'a', email: 'ana@primer.rs' })
    expect(loadPending('b')).toBeNull()
  })
})
