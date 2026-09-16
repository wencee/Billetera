import { ArrowLeftRight } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Screen } from '@/components/Screen'

export function MovementsScreen() {
  return (
    <Screen title="Movimientos">
      <EmptyState
        icon={<ArrowLeftRight size={56} strokeWidth={1.5} />}
        title="Todavía no hay movimientos"
        description="En la fase 3: gastos, ingresos, transferencias, búsqueda y filtros."
      />
    </Screen>
  )
}
