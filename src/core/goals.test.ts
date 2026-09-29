import { describe, expect, it } from 'vitest'
import { goalProgress, monthsLeft, projectedCompletion, savingPace, suggestedMonthly, summarizeGoal } from './goals'

describe('goalProgress', () => {
  it('suma aportes y resta retiros', () => {
    expect(goalProgress(100000, [{ amount: 30000 }, { amount: 20000 }, { amount: -5000 }])).toEqual({ saved: 45000, remaining: 55000, pct: 0.45, done: false })
  })
  it('completa y pasada', () => {
    expect(goalProgress(100000, [{ amount: 120000 }])).toMatchObject({ remaining: 0, pct: 1.2, done: true })
  })
  it('sin aportes', () => {
    expect(goalProgress(100000, [])).toEqual({ saved: 0, remaining: 100000, pct: 0, done: false })
  })
})

describe('monthsLeft', () => {
  it('cuenta los aportes mensuales que entran desde hoy', () => {
    expect(monthsLeft('2026-09-28', '2027-02-28')).toBe(6)
    expect(monthsLeft('2026-09-28', '2027-02-10')).toBe(5)
    expect(monthsLeft('2026-09-28', '2026-09-30')).toBe(1)
    expect(monthsLeft('2026-09-28', '2026-10-01')).toBe(1)
    expect(monthsLeft('2026-09-28', '2026-10-28')).toBe(2)
  })
})

describe('suggestedMonthly', () => {
  it('reparte lo que falta en los meses que quedan, redondeando al peso para arriba', () => {
    expect(suggestedMonthly(110000000, '2026-09-28', '2027-02-28')).toEqual({ monthly: 18333400, months: 6, overdue: false })
  })
  it('vencida: todo ahora', () => {
    expect(suggestedMonthly(50000, '2026-09-28', '2026-09-01')).toEqual({ monthly: 50000, months: 1, overdue: true })
  })
  it('nada que aportar', () => {
    expect(suggestedMonthly(0, '2026-09-28', '2027-01-01').monthly).toBe(0)
  })
})

describe('ritmo y proyección', () => {
  it('ritmo = aportes netos de los últimos 90 días por mes', () => {
    const entries = [
      { amount: 30000, date: '2026-07-15' },
      { amount: 30000, date: '2026-08-15' },
      { amount: 30000, date: '2026-09-15' },
      { amount: 999999, date: '2026-01-01' }, // fuera de la ventana
    ]
    // 90.000 en 90 días ≈ 30.437 por mes
    expect(savingPace(entries, '2026-09-28')).toBe(30438)
  })
  it('sin aportes recientes el ritmo es 0', () => {
    expect(savingPace([{ amount: 1000, date: '2025-01-01' }], '2026-09-28')).toBe(0)
  })
  it('proyección', () => {
    expect(projectedCompletion(100000, 30000, '2026-09-28')).toBe('2027-01-28')
    expect(projectedCompletion(0, 0, '2026-09-28')).toBe('2026-09-28')
    expect(projectedCompletion(100000, 0, '2026-09-28')).toBeNull()
  })
})

describe('summarizeGoal', () => {
  const entries = [
    { amount: 20000000, date: '2026-07-28' },
    { amount: 20000000, date: '2026-08-28' },
  ]
  it('en camino si al ritmo actual llega antes de la fecha', () => {
    const s = summarizeGoal({ targetAmount: 60000000, targetDate: '2027-03-01' }, entries, '2026-09-28')
    expect(s.status).toBe('onTrack')
    expect(s.suggestion?.months).toBe(6)
    expect(s.daysLeft).toBe(154)
  })
  it('atrasada si al ritmo actual no llega', () => {
    expect(summarizeGoal({ targetAmount: 150000000, targetDate: '2027-02-28' }, entries, '2026-09-28').status).toBe('behind')
  })
  it('vencida, completa, sin fecha y sin empezar', () => {
    expect(summarizeGoal({ targetAmount: 150000000, targetDate: '2026-09-01' }, entries, '2026-09-28').status).toBe('overdue')
    expect(summarizeGoal({ targetAmount: 40000000, targetDate: '2026-09-01' }, entries, '2026-09-28').status).toBe('done')
    expect(summarizeGoal({ targetAmount: 150000000 }, entries, '2026-09-28')).toMatchObject({ status: 'noDate', suggestion: null, daysLeft: null })
    expect(summarizeGoal({ targetAmount: 150000000, targetDate: '2027-01-01' }, [], '2026-09-28').status).toBe('notStarted')
  })
})
