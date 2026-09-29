import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router'
import { Fab } from '@/components/Fab'
import { TabBar } from '@/components/TabBar'
import { ToastHost } from '@/components/Toast'
import { generateDueRecurring } from '@/db'
import { QuickAddSheet } from '@/features/quick-add/QuickAddSheet'
import { KEYBOARD_PROXY_ID, useUIStore } from './store'
import { toast } from './toast'

/** Contenedor de toda la app: pantalla activa + tab bar + botón "+" + hoja de carga rápida. */
export function AppShell() {
  const quickAddOpen = useUIStore((s) => s.quickAddOpen)
  const openQuickAdd = useUIStore((s) => s.openQuickAdd)
  const closeQuickAdd = useUIStore((s) => s.closeQuickAdd)

  // Gastos fijos, suscripciones e ingresos recurrentes: se cargan solos al abrir la app y al volver a ella.
  useEffect(() => {
    const run = async () => {
      const n = await generateDueRecurring()
      if (n > 0) toast(n === 1 ? 'Se cargó 1 gasto fijo del día' : `Se cargaron ${n} movimientos fijos`)
    }
    void run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {/* El Suspense va acá (y no afuera) para que la tab bar no parpadee al cargar una pantalla. */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
      <Fab onPress={openQuickAdd} />
      <TabBar />
      <ToastHost />
      <QuickAddSheet open={quickAddOpen} onClose={closeQuickAdd} />
      {/* Input invisible: recibe el foco en el toque del "+" para que iOS abra el teclado numérico. */}
      <input
        id={KEYBOARD_PROXY_ID}
        aria-hidden
        tabIndex={-1}
        inputMode="decimal"
        autoComplete="off"
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        style={{ fontSize: 16 }}
      />
    </div>
  )
}
