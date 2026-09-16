import { CreditCard } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Screen } from '@/components/Screen'

export function CardsScreen() {
  return (
    <Screen title="Tarjetas">
      <EmptyState
        icon={<CreditCard size={56} strokeWidth={1.5} />}
        title="Tus tarjetas van acá"
        description="En la fase 2: carrusel de tarjetas, compras en cuotas, resúmenes y límite disponible."
      />
    </Screen>
  )
}
