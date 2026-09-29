import { ArrowDownLeft, ArrowLeftRight, CreditCard, Receipt, Repeat } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ListRow } from '@/components/List'
import { Sheet } from '@/components/Sheet'
import { useUIStore } from '@/app/store'

/** Menú del "+" de Movimientos: qué tipo de movimiento cargar. */
export function NewMovementSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const openQuickAdd = useUIStore((s) => s.openQuickAdd)
  const activeCardId = useUIStore((s) => s.activeCardId)
  const go = (to: string) => {
    onClose()
    navigate(to)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Nuevo movimiento">
      <div className="card overflow-hidden">
        <ListRow
          icon={<Receipt size={22} className="text-red" />}
          label="Gasto"
          chevron
          onPress={() => {
            onClose()
            openQuickAdd()
          }}
        />
        <ListRow icon={<ArrowDownLeft size={22} className="text-green" />} label="Ingreso" chevron onPress={() => go('/movimientos/ingreso/nuevo')} />
        <ListRow icon={<ArrowLeftRight size={22} className="text-tint" />} label="Transferencia entre cuentas" chevron onPress={() => go('/movimientos/transferencia/nueva')} />
        <ListRow
          icon={<CreditCard size={22} className="text-orange" />}
          label="Compra con tarjeta (detallada)"
          chevron
          onPress={() => go(activeCardId ? `/tarjetas/${activeCardId}/compras/nueva` : '/tarjetas')}
        />
        <ListRow icon={<Repeat size={22} className="text-purple" />} label="Gasto fijo o suscripción" chevron onPress={() => go('/ajustes/fijos/nuevo')} last />
      </div>
    </Sheet>
  )
}
