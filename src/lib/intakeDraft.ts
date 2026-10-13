import { normalizeIntake, type IntakeDraftValues } from './intakeSchema'

/** Ključ nacrta ankete u localStorage (ANKETA.md sekcija 4). */
export const INTAKE_DRAFT_KEY = 'ttz_intake_draft_v1'
/** Podaci za ekran izbora plana, u sessionStorage posle slanja ankete. */
export const INTAKE_PENDING_KEY = 'ttz_intake_pending_v1'

/** Nacrt nikad ne sadrži same fajlove, samo reference (`values.lab_files`) već poslatih nalaza. */
export interface IntakeDraft {
  intakeId: string
  values: IntakeDraftValues
}

export interface PendingIntake {
  intakeId: string
  email: string
}

const newDraft = (): IntakeDraft => ({ intakeId: crypto.randomUUID(), values: {} })

export function loadDraft(): IntakeDraft {
  try {
    const raw = localStorage.getItem(INTAKE_DRAFT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<IntakeDraft>
      if (
        typeof parsed.intakeId === 'string' &&
        parsed.values &&
        typeof parsed.values === 'object'
      ) {
        return { intakeId: parsed.intakeId, values: parsed.values }
      }
    }
  } catch {
    // nacrt je oštećen ili localStorage nije dostupan, počinje se iznova
  }
  // novi nacrt se odmah upisuje, da `intakeId` ostane isti između poziva
  const draft = newDraft()
  saveDraft(draft)
  return draft
}

export function saveDraft(draft: IntakeDraft): void {
  try {
    localStorage.setItem(INTAKE_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // privatni prozor ili pun prostor: anketa i dalje radi, samo se ne pamti
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(INTAKE_DRAFT_KEY)
  } catch {
    // nema šta da se obriše
  }
}

/** Spaja izmene u nacrt i briše uslovna polja čiji uslov više ne važi. */
export function mergeDraft(draft: IntakeDraft, patch: IntakeDraftValues): IntakeDraft {
  return { ...draft, values: normalizeIntake({ ...draft.values, ...patch }) }
}

export function savePending(pending: PendingIntake): void {
  try {
    sessionStorage.setItem(INTAKE_PENDING_KEY, JSON.stringify(pending))
  } catch {
    // ekran izbora plana će tražiti email ručno
  }
}

export function loadPending(intakeId: string): PendingIntake | null {
  try {
    const raw = sessionStorage.getItem(INTAKE_PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingIntake
    return parsed.intakeId === intakeId ? parsed : null
  } catch {
    return null
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(INTAKE_PENDING_KEY)
  } catch {
    // nema šta da se obriše
  }
}
