import { describe, expect, it } from 'vitest'
import { fixedTermReturn, investmentValue, maturingSoon, maturityFor, netWorth, portfolioTotals, type InvestmentLike } from './investments'

describe('plazo fijo', () => {
  it('interés simple base 365: $ 1.000.000 al 30 % TNA por 30 días', () => {
    const r = fixedTermReturn(100000000, 0.3, '2026-09-28', '2026-10-28')
    expect(r.days).toBe(30)
    expect(r.interest).toBe(2465753) // $ 24.657,53
    expect(r.total).toBe(102465753)
    expect(r.tea).toBeCloseTo(0.345, 3)
  })
  it('fecha de vencimiento a partir del plazo', () => {
    expect(maturityFor('2026-09-28', 30)).toBe('2026-10-28')
    expect(maturityFor('2026-12-15', 30)).toBe('2027-01-14')
  })
  it('plazo 0 o negativo no genera interés', () => {
    expect(fixedTermReturn(1000, 0.3, '2026-09-28', '2026-09-28')).toEqual({ days: 0, interest: 0, total: 1000, tea: 0 })
  })
})

const pf: InvestmentLike = { type: 'plazo_fijo', amount: 100000000, currency: 'ARS', date: '2026-09-28', tna: 0.3, maturityDate: '2026-10-28', closed: false }

describe('investmentValue', () => {
  it('plazo fijo: devenga día a día hasta el vencimiento', () => {
    expect(investmentValue(pf, '2026-09-28')).toMatchObject({ value: 100000000, source: 'accrued', gain: 0 })
    expect(investmentValue(pf, '2026-10-13').value).toBe(100000000 + Math.round((100000000 * 0.3 * 15) / 365))
    // después del vencimiento no sigue sumando
    expect(investmentValue(pf, '2026-12-01').value).toBe(102465753)
  })
  it('valuación manual tiene prioridad', () => {
    const fci: InvestmentLike = { type: 'fci', amount: 30000000, currency: 'ARS', date: '2026-08-01', currentValue: 31500000, currentValueDate: '2026-09-20', closed: false }
    expect(investmentValue(fci, '2026-09-28')).toEqual({ value: 31500000, source: 'manual', invested: 30000000, gain: 1500000, gainPct: 0.05 })
  })
  it('cerrada: lo que se cobró', () => {
    expect(investmentValue({ ...pf, closed: true, closedAt: '2026-10-28', closedAmount: 102465753 }, '2026-12-01')).toMatchObject({ value: 102465753, source: 'closed' })
  })
  it('sin datos: lo invertido', () => {
    expect(investmentValue({ type: 'crypto', amount: 50000, currency: 'USD', date: '2026-01-01', closed: false }, '2026-09-28')).toMatchObject({ value: 50000, source: 'cost', gainPct: 0 })
  })
  it('pérdida', () => {
    const c: InvestmentLike = { type: 'crypto', amount: 50000, currency: 'USD', date: '2026-01-01', currentValue: 40000, closed: false }
    expect(investmentValue(c, '2026-09-28')).toMatchObject({ gain: -10000, gainPct: -0.2 })
  })
})

describe('portfolio y vencimientos', () => {
  const list: InvestmentLike[] = [
    pf,
    { type: 'usd', amount: 50000, currency: 'USD', date: '2026-01-01', closed: false },
    { ...pf, maturityDate: '2026-10-05', date: '2026-09-05' },
    { ...pf, closed: true, closedAt: '2026-09-01', closedAmount: 1 },
  ]
  it('totales de abiertas por moneda', () => {
    const t = portfolioTotals(list, '2026-09-28')
    expect(t.invested).toEqual({ ARS: 200000000, USD: 50000 })
    expect(t.value.USD).toBe(50000)
    expect(t.value.ARS).toBeGreaterThan(200000000)
  })
  it('plazos fijos que vencen pronto, ordenados', () => {
    const soon = maturingSoon(list, '2026-10-03', 3)
    expect(soon.map((s) => [s.investment.maturityDate, s.state, s.daysLeft])).toEqual([['2026-10-05', 'upcoming', 2]])
    expect(maturingSoon(list, '2026-10-06', 0).map((s) => s.state)).toEqual(['matured'])
    expect(maturingSoon(list, '2026-10-05', 0).map((s) => s.state)).toEqual(['today'])
  })
})

describe('netWorth', () => {
  const parts = { accounts: { ARS: 1000000, USD: 10000 }, goals: { ARS: 400000, USD: 0 }, investments: { ARS: 2000000, USD: 5000 } }
  it('suma todo por moneda y convierte', () => {
    const n = netWorth(parts, 145000)
    expect(n.total).toEqual({ ARS: 3400000, USD: 15000 })
    expect(n.totalARS).toBe(3400000 + 21750000)
  })
  it('sin cotización y con dólares no hay total en pesos', () => {
    expect(netWorth(parts).totalARS).toBeNull()
    expect(netWorth({ ...parts, accounts: { ARS: 1, USD: 0 }, investments: { ARS: 0, USD: 0 } }).totalARS).toBe(400001)
  })
})
