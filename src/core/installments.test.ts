import { describe, expect, it } from 'vitest'
import { buildSchedule, installmentLabel, paidCount, pendingBalance } from './installments'
import { analyzeFinancing } from './interest'

const card = { closingDay: 28, dueDay: 10 }

describe('buildSchedule', () => {
  it('12 cuotas: un período por mes, vencen con cada resumen', () => {
    const amounts = analyzeFinancing({ cashPrice: 89999900, count: 12, financing: 'none' }).installments
    const s = buildSchedule({ amounts, firstPeriod: '2026-08', card })
    expect(s).toHaveLength(12)
    expect(s[0]).toEqual({ number: 1, count: 12, amount: 7499991, period: '2026-08', dueDate: '2026-09-10' })
    expect(s[4]?.period).toBe('2026-12')
    expect(s[5]?.period).toBe('2027-01')
    expect(s[5]?.dueDate).toBe('2027-02-10')
    expect(s[11]).toEqual({ number: 12, count: 12, amount: 7499999, period: '2027-07', dueDate: '2027-08-10' })
  })
  it('1 cuota', () => {
    const s = buildSchedule({ amounts: [8000], firstPeriod: '2026-09', card })
    expect(s).toEqual([{ number: 1, count: 1, amount: 8000, period: '2026-09', dueDate: '2026-10-10' }])
  })
  it('usa overrides de fechas reales', () => {
    const overrides = new Map([['2026-09', { closingDate: '2026-10-01', dueDate: '2026-10-14' }]])
    const s = buildSchedule({ amounts: [100, 100], firstPeriod: '2026-09', card, overrides })
    expect(s[0]?.dueDate).toBe('2026-10-14')
    expect(s[1]?.dueDate).toBe('2026-11-10')
  })
  it('sin cuotas tira error', () => {
    expect(() => buildSchedule({ amounts: [], firstPeriod: '2026-09', card })).toThrow()
  })
})

describe('helpers', () => {
  it('label', () => {
    expect(installmentLabel(3, 12)).toBe('3/12')
  })
  it('saldo pendiente y pagadas', () => {
    const list = [
      { amount: 100, status: 'paid' as const },
      { amount: 100, status: 'pending' as const },
      { amount: 50, status: 'pending' as const },
    ]
    expect(pendingBalance(list)).toBe(150)
    expect(paidCount(list)).toBe(1)
  })
})
