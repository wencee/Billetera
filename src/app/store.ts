import { create } from 'zustand'

/** Estado efímero de la UI. Todo lo persistente vive en Dexie. */
interface UIState {
  quickAddOpen: boolean
  openQuickAdd: () => void
  closeQuickAdd: () => void
  /** Tarjeta al frente del carrusel; se recuerda al cambiar de pestaña. */
  activeCardId: string | null
  setActiveCardId: (id: string | null) => void
}

/** Id del input invisible que abre el teclado dentro del toque del usuario (ver AppShell). */
export const KEYBOARD_PROXY_ID = 'keyboard-proxy'

export const useUIStore = create<UIState>((set) => ({
  quickAddOpen: false,
  openQuickAdd: () => {
    // iOS solo abre el teclado si el foco ocurre durante el toque. La hoja se monta
    // después, así que primero se enfoca un input invisible (abre el teclado) y
    // el campo de monto le "roba" el foco al montarse, con el teclado ya arriba.
    document.getElementById(KEYBOARD_PROXY_ID)?.focus({ preventScroll: true })
    set({ quickAddOpen: true })
  },
  closeQuickAdd: () => set({ quickAddOpen: false }),
  activeCardId: null,
  setActiveCardId: (id) => set({ activeCardId: id }),
}))
