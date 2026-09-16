import { create } from 'zustand'

export interface ToastData {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => unknown
  /** ms; default 5000. */
  duration?: number
}

interface ToastState {
  toast: ToastData | null
  show: (t: Omit<ToastData, 'id'>) => void
  dismiss: (id?: number) => void
}

let seq = 0

/**
 * Un solo toast a la vez, abajo, encima de la tab bar. Sirve para
 * "Compra borrada · Deshacer": borrar es reversible, no pide confirmación.
 */
export const useToastStore = create<ToastState>((set, get) => ({
  toast: null,
  show: (t) => set({ toast: { id: ++seq, ...t } }),
  dismiss: (id) => {
    const current = get().toast
    if (!current || (id !== undefined && current.id !== id)) return
    set({ toast: null })
  },
}))

export const toast = (message: string, opts: Omit<ToastData, 'id' | 'message'> = {}) => useToastStore.getState().show({ message, ...opts })
