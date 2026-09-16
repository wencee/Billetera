import { formatPct } from './format'
import type { Installment, Purchase } from './types'

export interface PurchaseProgress {
  paid: number
  remaining: number
  count: number
  pendingAmount: number
  /** Fecha de vencimiento de la última cuota. */
  lastDueDate: string | null
  /** Próxima cuota pendiente (número), o null si ya se pagó todo. */
  nextNumber: number | null
}

export function purchaseProgress(installments: readonly Installment[]): PurchaseProgress {
  const sorted = [...installments].sort((a, b) => a.number - b.number)
  let paid = 0
  let pendingAmount = 0
  let nextNumber: number | null = null
  for (const i of sorted) {
    if (i.status === 'paid') paid++
    else {
      pendingAmount += i.amount
      if (nextNumber === null) nextNumber = i.number
    }
  }
  const count = sorted.length
  return {
    paid,
    remaining: count - paid,
    count,
    pendingAmount,
    lastDueDate: sorted[count - 1]?.dueDate ?? null,
    nextNumber,
  }
}

/**
 * Badge de la lista de compras: "3/12 · sin interés" o "6/6 · con interés 23 %".
 * El número es la próxima cuota a pagar (o la última si ya está saldada).
 */
export function purchaseBadge(purchase: Pick<Purchase, 'installments' | 'financing' | 'cashPrice' | 'totalAmount'>, progress: Pick<PurchaseProgress, 'nextNumber' | 'count'>): string {
  const current = progress.nextNumber ?? progress.count
  const position = `${current}/${purchase.installments}`
  if (purchase.financing === 'none' || purchase.totalAmount <= purchase.cashPrice) {
    return purchase.installments === 1 ? '1 pago' : `${position} · sin interés`
  }
  const pct = (purchase.totalAmount - purchase.cashPrice) / purchase.cashPrice
  return `${position} · con interés ${formatPct(pct, pct * 100 >= 10 ? 0 : 1)}`
}

export const INSTALLMENT_PRESETS = [1, 3, 6, 9, 12, 18, 24] as const
