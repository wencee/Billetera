import { describe, expect, it } from 'vitest'
import { average, categoryBreakdown, change, incomeByMonth, lastMonths, savingsRate, spendingByMonth } from './stats'

describe('stats', () => {
  it('lastMonths termina en el mes pedido y cruza el año', () => {
    expect(lastMonths('2027-02', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('gasto e ingreso por mes, con USD convertido o ignorado', () => {
    const months = ['2026-08', '2026-09']
    const items = [
      { categoryId: 'a', month: '2026-08', amount: 100, currency: 'ARS' as const },
      { categoryId: 'a', month: '2026-09', amount: 200, currency: 'ARS' as const },
      { categoryId: 'b', month: '2026-09', amount: 10, currency: 'USD' as const },
      { categoryId: 'b', month: '2026-07', amount: 999, currency: 'ARS' as const },
    ]
    expect(spendingByMonth(items, months, 100000)).toEqual([{ month: '2026-08', total: 100 }, { month: '2026-09', total: 10200 }])
    expect(spendingByMonth(items, months)).toEqual([{ month: '2026-08', total: 100 }, { month: '2026-09', total: 200 }])
    expect(incomeByMonth([{ amount: 500, currency: 'ARS', date: '2026-09-05' }, { amount: 1, currency: 'ARS', date: '2026-10-01' }], months)).toEqual([
      { month: '2026-08', total: 0 },
      { month: '2026-09', total: 500 },
    ])
  })

  it('categorías ordenadas y la cola agrupada en "Otras"', () => {
    const byCategory = new Map([['a', 500], ['b', 300], ['c', 100], ['d', 60], ['e', 40], ['z', 0]])
    const cats = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase(), icon: '•' }))
    const rows = categoryBreakdown({ byCategory, total: 1000 }, cats, 3)
    expect(rows.map((r) => [r.categoryId, r.amount, r.pct])).toEqual([['a', 500, 0.5], ['b', 300, 0.3], ['other', 200, 0.2]])
    expect(rows[2]!.name).toBe('Otras (3)')
    expect(categoryBreakdown({ byCategory, total: 1000 }, cats).length).toBe(5)
  })

  it('variación, tasa de ahorro y promedio', () => {
    expect(change(120, 100)).toEqual({ delta: 20, pct: 0.2 })
    expect(change(50, 0)).toEqual({ delta: 50, pct: null })
    expect(savingsRate(1000, 750)).toBe(0.25)
    expect(savingsRate(0, 10)).toBeNull()
    expect(average([1, 2, 3])).toBe(2)
    expect(average([])).toBe(0)
  })
})
