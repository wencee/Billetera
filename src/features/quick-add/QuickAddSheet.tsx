import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Pressable'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Fase 1: hoja de prueba para validar el gesto de arrastre, el scroll interno
 * y la respuesta de los botones en el iPhone. En la fase 3 se convierte en
 * la carga rápida real.
 */
export function QuickAddSheet({ open, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Carga rápida">
      <div className="py-6 text-center">
        <p className="text-footnote uppercase text-label-2">Monto</p>
        <p className="tabular text-[2.6rem] font-bold leading-none tracking-tight">$ 0,00</p>
        <p className="mt-2 text-subhead text-label-2">Disponible en la fase 3</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {['🛒 Supermercado', '🍔 Comida afuera', '🚌 Transporte', '⛽ Nafta', '🏠 Casa', '💡 Servicios'].map((c) => (
          <button key={c} type="button" className="rounded-full bg-fill px-4 py-2 text-subhead active:bg-fill-2">
            {c}
          </button>
        ))}
      </div>
      <h3 className="mt-6 mb-2 text-footnote uppercase text-label-2">Prueba de gestos</h3>
      <ul className="card divide-y divide-separator/60">
        {Array.from({ length: 24 }, (_, i) => (
          <li key={i} className="px-4 py-3 text-body">
            Fila {i + 1} — scrolleá hasta arriba y arrastrá hacia abajo para cerrar
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Guardar
        </Button>
      </div>
    </Sheet>
  )
}
