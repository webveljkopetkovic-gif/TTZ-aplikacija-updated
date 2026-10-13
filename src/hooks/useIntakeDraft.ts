import { useCallback, useState } from 'react'
import { clearDraft, loadDraft, mergeDraft, saveDraft, type IntakeDraft } from '@/lib/intakeDraft'
import type { IntakeDraftValues } from '@/lib/intakeSchema'

/** Nacrt ankete u localStorage: čuva se posle svake promene, bez fajlova. */
export function useIntakeDraft() {
  const [draft, setDraft] = useState<IntakeDraft>(loadDraft)

  const update = useCallback((patch: IntakeDraftValues) => {
    // čitamo iz skladišta, a ne iz state-a, da dva uzastopna poziva ne gube izmene
    const next = mergeDraft(loadDraft(), patch)
    saveDraft(next)
    setDraft(next)
    return next
  }, [])

  const clear = useCallback(() => {
    clearDraft()
    setDraft(loadDraft())
  }, [])

  return { draft, update, clear }
}
