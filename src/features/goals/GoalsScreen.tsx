import { PiggyBank } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Screen } from '@/components/Screen'

export function GoalsScreen() {
  return (
    <Screen title="Metas y ahorros">
      <EmptyState
        icon={<PiggyBank size={56} strokeWidth={1.5} />}
        title="Sin metas por ahora"
        description="En la fase 4: metas con progreso, aportes, plazos fijos e inversiones."
      />
    </Screen>
  )
}
