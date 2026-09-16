import { describe, expect, it } from 'vitest'
import { analyzeFinancing, annualize, installmentForRate, solveMonthlyRate } from './interest'

describe('sistema francés', () => {
  it('cuota conocida: $1.000 al 5 % mensual en 12 → $112,83', () => {
    expect(installmentForRate(100000, 0.05, 12)).toBeCloseTo(11282.54, 1)
  })
  it('tasa 0 → división simple', () => {
    expect(installmentForRate(120000, 0, 12)).toBe(10000)
  })
  it('la tasa resuelta reproduce la cuota (ida y vuelta)', () => {
    const c = installmentForRate(100000, 0.05, 12)
    expect(solveMonthlyRate(100000, c, 12)).toBeCloseTo(0.05, 9)
  })
  it('1 cuota con recargo: i = C/P − 1', () => {
    expect(solveMonthlyRate(100000, 110000, 1)).toBeCloseTo(0.1, 9)
  })
  it('sin recargo (o descuento) → tasa 0', () => {
    expect(solveMonthlyRate(100000, 8000, 12)).toBe(0)
    expect(solveMonthlyRate(120000, 10000, 12)).toBe(0)
  })
  it('tasas anuales', () => {
    const { tna, tea } = annualize(0.05)
    expect(tna).toBeCloseTo(0.6, 9)
    expect(tea).toBeCloseTo(0.795856, 5)
  })
})

describe('analyzeFinancing', () => {
  it('sin interés: cuotas iguales con ajuste en la última', () => {
    const r = analyzeFinancing({ cashPrice: 89999900, count: 12, financing: 'none' })
    expect(r.installments).toHaveLength(12)
    expect(r.installmentAmount).toBe(7499991)
    expect(r.installments[11]).toBe(7499999)
    expect(r.totalAmount).toBe(89999900)
    expect(r.totalInterest).toBe(0)
    expect(r.surchargePct).toBe(0)
    expect(r.tna).toBe(0)
    expect(r.tea).toBe(0)
  })

  it('cargando el valor de cada cuota (6 × $45.000 sobre $220.000 contado)', () => {
    const r = analyzeFinancing({
      cashPrice: 22000000, count: 6, financing: 'interest',
      interestInput: { mode: 'installment', value: 4500000 },
    })
    expect(r.installments).toEqual(new Array(6).fill(4500000))
    expect(r.totalAmount).toBe(27000000)
    expect(r.totalInterest).toBe(5000000)
    expect(r.surchargePct).toBeCloseTo(0.2273, 3)
    expect(r.monthlyRate).toBeGreaterThan(0)
    // La tasa implícita reproduce la cuota
    expect(installmentForRate(22000000, r.monthlyRate, 6)).toBeCloseTo(4500000, 0)
    expect(r.tna).toBeCloseTo(r.monthlyRate * 12, 12)
  })

  it('cargando el total financiado reparte con redondeo en la última', () => {
    const r = analyzeFinancing({
      cashPrice: 10000000, count: 3, financing: 'interest',
      interestInput: { mode: 'total', value: 11000000 },
    })
    expect(r.installments).toEqual([3666666, 3666666, 3666668])
    expect(r.totalAmount).toBe(11000000)
    expect(r.surchargePct).toBeCloseTo(0.1, 9)
  })

  it('cargando TNA 60 % → cuota del sistema francés y tasas coherentes', () => {
    const r = analyzeFinancing({
      cashPrice: 100000, count: 12, financing: 'interest',
      interestInput: { mode: 'tna', value: 0.6 },
    })
    expect(r.installmentAmount).toBe(11283)
    expect(r.totalAmount).toBe(11283 * 12)
    expect(r.monthlyRate).toBeCloseTo(0.05, 4)
    expect(r.tna).toBeCloseTo(0.6, 3)
    expect(r.tea).toBeCloseTo(0.7959, 3)
  })

  it('TNA 0 con interés equivale a sin interés', () => {
    const r = analyzeFinancing({ cashPrice: 120000, count: 12, financing: 'interest', interestInput: { mode: 'tna', value: 0 } })
    expect(r.installmentAmount).toBe(10000)
    expect(r.totalInterest).toBe(0)
  })

  it('1 cuota con interés', () => {
    const r = analyzeFinancing({ cashPrice: 100000, count: 1, financing: 'interest', interestInput: { mode: 'installment', value: 110000 } })
    expect(r.totalInterest).toBe(10000)
    expect(r.monthlyRate).toBeCloseTo(0.1, 9)
  })

  it('24 cuotas en USD (los centavos son centavos de dólar)', () => {
    const r = analyzeFinancing({ cashPrice: 100000, count: 24, financing: 'none' })
    expect(r.installments).toHaveLength(24)
    expect(r.installmentAmount).toBe(4166)
    expect(r.installments[23]).toBe(100000 - 4166 * 23)
  })

  it('plan más barato que el contado: interés negativo, tasa 0', () => {
    const r = analyzeFinancing({ cashPrice: 100000, count: 12, financing: 'interest', interestInput: { mode: 'installment', value: 8000 } })
    expect(r.totalInterest).toBe(-4000)
    expect(r.monthlyRate).toBe(0)
  })

  it('valida entradas', () => {
    expect(() => analyzeFinancing({ cashPrice: 0, count: 3, financing: 'none' })).toThrow()
    expect(() => analyzeFinancing({ cashPrice: 100, count: 0, financing: 'none' })).toThrow()
    expect(() => analyzeFinancing({ cashPrice: 100, count: 2.5, financing: 'none' })).toThrow()
    expect(() => analyzeFinancing({ cashPrice: 100, count: 3, financing: 'interest', interestInput: { mode: 'tna', value: -1 } })).toThrow()
  })
})
