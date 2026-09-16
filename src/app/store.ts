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

export const useUIStore = create<UIState>((set) => ({
  quickAddOpen: false,
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  activeCardId: null,
  setActiveCardId: (id) => set({ activeCardId: id }),
}))
