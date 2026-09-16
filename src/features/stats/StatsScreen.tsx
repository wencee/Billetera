import { PieChart } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Screen } from '@/components/Screen'

export function StatsScreen() {
  return (
    <Screen title="Estadísticas">
      <EmptyState
        icon={<PieChart size={56} strokeWidth={1.5} />}
        title="Nada que graficar todavía"
        description="En la fase 5: gasto por categoría, evolución mensual y compromisos futuros."
      />
    </Screen>
  )
}
