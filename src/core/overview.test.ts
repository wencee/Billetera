import { describe, expect, it } from 'vitest'
import { monthOverview } from './overview'
import { statementsDueInMonth, statementTotalARS } from './statements'

const base = {
  month: '2026-09',
  today: '2026-09-20',
  incomes: [
    { amount: 200000000, currency: 'ARS' as const, date: '2026-09-05' },
    { amount: 999, currency: 'ARS' as const, date: '2026-08-31' }, // otro mes
  ],
  expenses: [
    { amount: 5000000, currency: 'ARS' as const, date: '2026-09-10' },
    { amount: 2000, currency: 'USD' as const, date: '2026-09-12' },
  ],
  recurring: [],
  cardsDue: [30000000, 10000000],
}

describe('monthOverview', () => {
  it('ingresos − gastos − tarjetas, con USD convertido', () => {
    const o = monthOverview({ ...base, usdRate: 145000 })
    expect(o.income).toEqual({ received: 200000000, expected: 0 })
    expect(o.spent).toEqual({ done: 5000000 + 2900000, expectedFixed: 0 })
    expect(o.cards).toBe(40000000)
    expect(o.available).toBe(200000000 - 7900000 - 40000000)
    expect(o.daysLeft).toBe(11)
    expect(o.perDay).toBe(Math.floor(152100000 / 11 / 100) * 100)
    expect(o.unconvertedUSD).toBe(false)
  })

  it('sin cotización, el USD no se resta y se avisa', () => {
    const o = monthOverview(base)
    expect(o.spent.done).toBe(5000000)
    expect(o.unconvertedUSD).toBe(true)
  })

  it('suma los fijos que faltan este mes (no los con tarjeta ni los ya generados)', () => {
    const rule = { frequency: 'monthly' as const, startDate: '2026-01-01', active: true, currency: 'ARS' as const }
    const o = monthOverview({
      ...base,
      recurring: [
        { ...rule, kind: 'expense', amount: 45000000, day: 25, method: 'transfer', lastGeneratedUntil: '2026-09-20' },
        { ...rule, kind: 'expense', amount: 2000000, day: 5, method: 'debit', lastGeneratedUntil: '2026-09-20' }, // ya pasó
        { ...rule, kind: 'expense', amount: 999900, day: 28, method: 'card', lastGeneratedUntil: '2026-09-20' },
        { ...rule, kind: 'income', amount: 30000000, day: 30, method: 'transfer', lastGeneratedUntil: '2026-09-20' },
        { ...rule, kind: 'expense', amount: 1, day: 25, method: 'cash', active: false },
      ],
    })
    expect(o.spent.expectedFixed).toBe(45000000)
    expect(o.income.expected).toBe(30000000)
  })

  it('perDay es null si no queda nada', () => {
    expect(monthOverview({ ...base, cardsDue: [999999999] }).perDay).toBeNull()
  })
})

describe('statementsDueInMonth', () => {
  const card = { closingDay: 28, dueDay: 10 }
  const installments = [
    { period: '2026-08', amount: 1000, currency: 'ARS' as const },
    { period: '2026-08', amount: 10, currency: 'USD' as const },
    { period: '2026-09', amount: 2000, currency: 'ARS' as const },
  ]
  it('el resumen de agosto vence en septiembre', () => {
    const due = statementsDueInMonth({ card, month: '2026-09', installments, payments: [], today: '2026-09-05' })
    expect(due.map((s) => [s.period, s.dueDate])).toEqual([['2026-08', '2026-09-10']])
    // US$ 0,10 a $ 1.000 = $ 100
    expect(statementTotalARS(due[0]!, 100000)).toBe(1000 + 10000)
    expect(statementTotalARS(due[0]!)).toBe(1000)
  })
  it('vencimiento el mismo mes del cierre', () => {
    const due = statementsDueInMonth({ card: { closingDay: 5, dueDay: 20 }, month: '2026-09', installments, payments: [], today: '2026-09-05' })
    expect(due.map((s) => [s.period, s.dueDate])).toEqual([['2026-09', '2026-09-20']])
    const due2 = statementsDueInMonth({ card: { closingDay: 5, dueDay: 20 }, month: '2026-08', installments, payments: [], today: '2026-08-05' })
    expect(due2.map((s) => [s.period, s.dueDate])).toEqual([['2026-08', '2026-08-20']])
  })
})
