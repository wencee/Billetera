import type { Movement } from '@/core/movements'

/** Pantalla de edición (o detalle) de cada tipo de movimiento. */
export function movementEditPath(m: Pick<Movement, 'kind' | 'id' | 'cardId' | 'saving'>): string {
  switch (m.kind) {
    case 'expense': return `/movimientos/gasto/${m.id}`
    case 'income': return `/movimientos/ingreso/${m.id}`
    case 'transfer': return `/movimientos/transferencia/${m.id}`
    case 'card': return `/compras/${m.id}/editar`
    case 'cardPayment': return `/tarjetas/${m.cardId}/resumenes`
    case 'saving': return m.saving?.type === 'goalEntry' ? `/metas/${m.saving.parentId}` : `/metas/inversiones/${m.saving?.parentId ?? m.id}`
  }
}

/** Al tocar la fila: la compra con tarjeta abre su detalle con el cronograma; el resto, su edición. */
export function movementOpenPath(m: Pick<Movement, 'kind' | 'id' | 'cardId' | 'saving'>): string {
  return m.kind === 'card' ? `/compras/${m.id}` : movementEditPath(m)
}
