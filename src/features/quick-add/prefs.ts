/** Últimas elecciones de la carga rápida (preferencia local de este dispositivo, no son datos). */
export interface QuickAddPrefs {
  accountId: string
  cardId: string
  withCard: boolean
}

const KEY = 'billetera:quick-add'
const DEFAULTS: QuickAddPrefs = { accountId: '', cardId: '', withCard: false }

export function loadQuickAddPrefs(): QuickAddPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<QuickAddPrefs>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function saveQuickAddPrefs(prefs: QuickAddPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Sin localStorage (modo privado estricto): simplemente no se recuerda.
  }
}
