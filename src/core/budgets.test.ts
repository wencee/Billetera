import { describe, expect, it } from 'vitest'
import { budgetLevel, budgetRows, spendingForMonth, spendingItems } from './budgets'

describe('budgetLevel', () => {
  it('ok, aviso al 80 % y pasado al 100 %', () => {
    expect(budgetLevel(7999, 10000)).toBe('ok')
    expect(budgetLevel(8000, 10000)).toBe('warning')
    expect(budgetLevel(9999, 10000)).toBe('warning')
    expect(budgetLevel(10000, 10000)).toBe('over')
    expect(budgetLevel(15000, 10000)).toBe('over')
  })
  it('límite cero', () => {
    expect(budgetLevel(0, 0)).toBe('ok')
    expect(budgetLevel(1, 0)).toBe('over')
  })
})

describe('spendingItems', () => {
  it('gastos en su mes; cada cuota en el mes de compra + (n − 1)', () => {
    const items = spendingItems({
      expenses: [{ categoryId: 'super', date: '2026-09-15', amount: 5000, currency: 'ARS' }],
      purchases: [{ id: 'p1', categoryId: 'casa', date: '2026-09-30' }],
      installments: [
        { purchaseId: 'p1', number: 1, amount: 1000, currency: 'ARS' },
        { purchaseId: 'p1', number: 2, amount: 1000, currency: 'ARS' },
        { purchaseId: 'p1', number: 3, amount: 1002, currency: 'ARS' },
        { purchaseId: 'huérfana', number: 1, amount: 99, currency: 'ARS' },
      ],
    })
    expect(items).toEqual([
      { categoryId: 'super', month: '2026-09', amount: 5000, currency: 'ARS' },
      { categoryId: 'casa', month: '2026-09', amount: 1000, currency: 'ARS' },
      { categoryId: 'casa', month: '2026-10', amount: 1000, currency: 'ARS' },
      { categoryId: 'casa', month: '2026-11', amount: 1002, currency: 'ARS' },
    ])
  })
})

describe('spendingForMonth y budgetRows', () => {
  const items = [
    { categoryId: 'super', month: '2026-09', amount: 24000, currency: 'ARS' as const },
    { categoryId: 'super', month: '2026-08', amount: 99999, currency: 'ARS' as const },
    { categoryId: 'tech', month: '2026-09', amount: 1000, currency: 'USD' as const },
  ]
  it('convierte USD con la cotización', () => {
    const s = spendingForMonth(items, '2026-09', 145000)
    expect(s.byCategory.get('super')).toBe(24000)
    expect(s.byCategory.get('tech')).toBe(1450000)
    expect(s.total).toBe(1474000)
    expect(s.unconvertedUSD).toBe(0)
  })
  it('sin cotización el USD queda aparte', () => {
    const s = spendingForMonth(items, '2026-09')
    expect(s.byCategory.has('tech')).toBe(false)
    expect(s.unconvertedUSD).toBe(1000)
  })
  it('filas de presupuesto', () => {
    const rows = budgetRows([{ categoryId: 'super', monthlyLimit: 30000 }, { categoryId: 'ropa', monthlyLimit: 10000 }], spendingForMonth(items, '2026-09'))
    expect(rows[0]).toEqual({ categoryId: 'super', limit: 30000, spent: 24000, remaining: 6000, pct: 0.8, level: 'warning' })
    expect(rows[1]).toMatchObject({ spent: 0, level: 'ok' })
  })
})
