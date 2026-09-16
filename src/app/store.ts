import { create } from 'zustand'

/** Estado efímero de la UI. Todo lo persistente vive en Dexie. */
interface UIState {
  quickAddOpen: boolean
  openQuickAdd: () => void
  closeQuickAdd: () => void
}

export const useUIStore = create<UIState>((set) => ({
  quickAddOpen: false,
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
}))
