import { describe, expect, it } from 'vitest'
import { availableLimit } from './limits'

describe('availableLimit', () => {
  it('límite menos cuotas pendientes en ARS', () => {
    const r = availableLimit({ limit: 100000000, pendingARS: 25000000, pendingUSD: 0 })
    expect(r).toEqual({ used: 25000000, available: 75000000, usedPct: 0.25, usdUnconverted: false })
  })
  it('convierte USD con la cotización', () => {
    const r = availableLimit({ limit: 100000000, pendingARS: 0, pendingUSD: 8000, usdRate: 145000 })
    expect(r.used).toBe(11600000)
    expect(r.available).toBe(88400000)
  })
  it('sin cotización avisa y no convierte', () => {
    const r = availableLimit({ limit: 100000000, pendingARS: 1000, pendingUSD: 8000 })
    expect(r.used).toBe(1000)
    expect(r.usdUnconverted).toBe(true)
  })
  it('puede quedar negativo (límite excedido)', () => {
    const r = availableLimit({ limit: 1000, pendingARS: 1500, pendingUSD: 0 })
    expect(r.available).toBe(-500)
    expect(r.usedPct).toBe(1.5)
  })
})
