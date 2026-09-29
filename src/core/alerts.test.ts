import { describe, expect, it } from 'vitest'
import { badgeCount, buildAlerts, type AlertCard, type AlertInput } from './alerts'
import { summarizeStatement } from './statements'

const card = { closingDay: 28, dueDay: 10 }
const today = '2026-10-08'
const installments = [
  { period: '2026-08', amount: 50000, currency: 'ARS' as const },
  { period: '2026-09', amount: 120000, currency: 'ARS' as const },
  { period: '2026-10', amount: 30000, currency: 'ARS' as const },
]
const summary = (period: string, payments: { period: string; amount: number; kind: 'total' | 'partial' | 'minimum' }[] = []) =>
  summarizeStatement({ card, period, installments, payments, today })

const visa = (payments: Parameters<typeof summary>[1] = []): AlertCard => ({
  id: 'visa', label: 'Visa •4321', current: summary('2026-10', payments), closed: [summary('2026-08', payments), summary('2026-09', payments)],
})

const empty: AlertInput = { today, daysAhead: 3, cards: [], budgets: [], goals: [], investments: [] }

describe('buildAlerts: tarjetas', () => {
  it('resumen impago vencido (peligro) y el que vence en 2 días (advertencia)', () => {
    const alerts = buildAlerts({ ...empty, cards: [visa()] })
    expect(alerts.map((a) => [a.kind, a.level, a.date])).toEqual([
      ['cardOverdue', 'danger', '2026-09-10'],
      ['cardDue', 'warning', '2026-10-10'],
    ])
    expect(alerts[1]!.title).toBe('Vence el resumen de Visa •4321')
    expect(alerts[1]!.detail.replace(/ /g, ' ')).toBe('En 2 días (10 oct) · $ 1.200')
    expect(alerts[0]!.target).toEqual({ type: 'statement', cardId: 'visa', period: '2026-08' })
  })
  it('pagados no avisan; parcial avisa lo que falta', () => {
    const alerts = buildAlerts({ ...empty, cards: [visa([{ period: '2026-08', amount: 50000, kind: 'total' }, { period: '2026-09', amount: 20000, kind: 'partial' }])] })
    expect(alerts.map((a) => a.kind)).toEqual(['cardDue'])
    expect(alerts[0]!.detail.replace(/ /g, ' ')).toContain('$ 1.000')
  })
  it('cierre dentro de los días de anticipación', () => {
    const alerts = buildAlerts({ ...empty, today: '2026-10-26', cards: [{ ...visa(), closed: [] }] })
    expect(alerts.map((a) => [a.kind, a.title])).toEqual([['cardClosing', 'Visa •4321 cierra en 2 días']])
  })
})

describe('buildAlerts: presupuestos, metas, inversiones, backup y dólar', () => {
  it('arma cada aviso con su nivel y los ordena', () => {
    const alerts = buildAlerts({
      ...empty,
      budgets: [
        { categoryId: 'super', name: 'Supermercado', icon: '🛒', limit: 100, spent: 120, remaining: -20, pct: 1.2, level: 'over' },
        { categoryId: 'cafe', name: 'Café', icon: '☕', limit: 100, spent: 85, remaining: 15, pct: 0.85, level: 'warning' },
        { categoryId: 'ok', name: 'Ok', icon: '✅', limit: 100, spent: 10, remaining: 90, pct: 0.1, level: 'ok' },
      ],
      goals: [
        { id: 'g1', name: 'Viaje', emoji: '🏖️', currency: 'ARS', targetDate: '2026-10-28', done: false, remaining: 5000, archived: false },
        { id: 'g2', name: 'Moto', emoji: '🏍️', currency: 'ARS', targetDate: '2026-09-01', done: false, remaining: 5000, archived: false },
        { id: 'g3', name: 'Lista', emoji: '✅', currency: 'ARS', targetDate: '2026-10-10', done: true, remaining: 0, archived: false },
      ],
      investments: [
        { id: 'pf1', name: 'PF Galicia', maturityDate: '2026-10-09', closed: false },
        { id: 'pf2', name: 'PF Nación', maturityDate: '2026-10-01', closed: false },
        { id: 'pf3', name: 'PF viejo', maturityDate: '2026-09-01', closed: true },
      ],
      backup: { enabled: true, hasData: true },
      usd: { rate: 145000, date: '2026-09-01', inUse: true },
    })
    const kinds = alerts.map((a) => a.kind)
    expect(kinds.slice(0, 1)).toEqual(['budgetOver'])
    expect(new Set(kinds)).toEqual(new Set(['budgetOver', 'budgetWarning', 'goalSoon', 'goalOverdue', 'fixedTermMatured', 'fixedTermMaturing', 'backup', 'usdRateStale']))
    expect(alerts.map((a) => a.level)).toEqual([...alerts.map((a) => a.level)].sort((a, b) => ({ danger: 0, warning: 1, info: 2 })[a] - ({ danger: 0, warning: 1, info: 2 })[b]))
    expect(badgeCount(alerts)).toBe(5)
    expect(alerts.find((a) => a.kind === 'goalSoon')!.title).toBe('🏖️ Viaje: faltan 20 días')
    expect(alerts.find((a) => a.kind === 'backup')!.detail).toBe('Nunca hiciste uno: tus datos están solo en este teléfono')
  })
  it('backup reciente o apagado no avisa', () => {
    expect(buildAlerts({ ...empty, backup: { enabled: true, hasData: true, lastBackupAt: '2026-10-05T10:00:00Z' } })).toEqual([])
    expect(buildAlerts({ ...empty, backup: { enabled: false, hasData: true } })).toEqual([])
    expect(buildAlerts({ ...empty, backup: { enabled: true, hasData: false } })).toEqual([])
  })
})

describe('buildAlerts en modo privado', () => {
  it('tapa los montos del detalle', () => {
    const alerts = buildAlerts({ ...empty, cards: [visa()], hide: true })
    expect(alerts.find((a) => a.kind === 'cardDue')!.detail.replace(/ /g, ' ')).toBe('En 2 días (10 oct) · $ ••••')
  })
})
