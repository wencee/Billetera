import { describe, expect, it } from 'vitest'
import { purchaseBadge, purchaseProgress } from './purchases'
import type { Installment } from './types'

const inst = (number: number, count: number, status: 'paid' | 'pending', amount = 100): Installment => ({
  id: `i${number}`, purchaseId: 'p', cardId: 'c', number, count, amount, currency: 'ARS',
  period: `2026-${String(number).padStart(2, '0')}`, dueDate: `2026-${String(number).padStart(2, '0')}-10`, status,
})

describe('purchaseProgress', () => {
  it('cuenta pagadas, pendientes y próxima', () => {
    const p = purchaseProgress([inst(1, 3, 'paid'), inst(2, 3, 'pending'), inst(3, 3, 'pending')])
    expect(p).toEqual({ paid: 1, remaining: 2, count: 3, pendingAmount: 200, lastDueDate: '2026-03-10', nextNumber: 2 })
  })
  it('todo pago', () => {
    const p = purchaseProgress([inst(1, 1, 'paid')])
    expect(p.nextNumber).toBeNull()
    expect(p.pendingAmount).toBe(0)
  })
  it('sin cuotas', () => {
    expect(purchaseProgress([]).lastDueDate).toBeNull()
  })
})

describe('purchaseBadge', () => {
  it('sin interés', () => {
    expect(purchaseBadge({ installments: 12, financing: 'none', cashPrice: 100, totalAmount: 100 }, { nextNumber: 3, count: 12 })).toBe('3/12 · sin interés')
  })
  it('un pago', () => {
    expect(purchaseBadge({ installments: 1, financing: 'none', cashPrice: 100, totalAmount: 100 }, { nextNumber: 1, count: 1 })).toBe('1 pago')
  })
  it('con interés muestra el recargo', () => {
    const b = purchaseBadge({ installments: 6, financing: 'interest', cashPrice: 22000000, totalAmount: 27000000 }, { nextNumber: null, count: 6 })
    expect(b.replace(/ /g, ' ')).toBe('6/6 · con interés 23 %')
  })
  it('recargo chico con un decimal', () => {
    const b = purchaseBadge({ installments: 3, financing: 'interest', cashPrice: 100000, totalAmount: 105500 }, { nextNumber: 1, count: 3 })
    expect(b.replace(/ /g, ' ')).toBe('1/3 · con interés 5,5 %')
  })
})
