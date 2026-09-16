import { Outlet } from 'react-router'
import { Fab } from '@/components/Fab'
import { TabBar } from '@/components/TabBar'
import { ToastHost } from '@/components/Toast'
import { QuickAddSheet } from '@/features/quick-add/QuickAddSheet'
import { useUIStore } from './store'

/** Contenedor de toda la app: pantalla activa + tab bar + botón "+" + hoja de carga rápida. */
export function AppShell() {
  const quickAddOpen = useUIStore((s) => s.quickAddOpen)
  const openQuickAdd = useUIStore((s) => s.openQuickAdd)
  const closeQuickAdd = useUIStore((s) => s.closeQuickAdd)
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <Outlet />
      <Fab onPress={openQuickAdd} />
      <TabBar />
      <ToastHost />
      <QuickAddSheet open={quickAddOpen} onClose={closeQuickAdd} />
    </div>
  )
}
