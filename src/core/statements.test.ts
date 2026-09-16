import { describe, expect, it } from 'vitest'
import {
  closingDateFor, currentPeriod, dueDateFor, firstPeriodFor, statementDates, statementStatus,
  type DateOverride, type Overrides,
} from './statements'

const card = { closingDay: 28, dueDay: 10 }

describe('fechas de cierre y vencimiento por defecto', () => {
  it('cierre el día fijo, vence el primer dueDay posterior (mes siguiente)', () => {
    expect(closingDateFor(card, '2026-09')).toBe('2026-09-28')
    expect(dueDateFor(card, '2026-09')).toBe('2026-10-10')
  })
  it('si el vencimiento cae después del cierre en el mismo mes, es ese mes', () => {
    const c = { closingDay: 5, dueDay: 20 }
    expect(dueDateFor(c, '2026-09')).toBe('2026-09-20')
  })
  it('cierre el 30 en febrero se recorta al 28 (y al 29 en bisiesto)', () => {
    const c = { closingDay: 30, dueDay: 10 }
    expect(closingDateFor(c, '2026-02')).toBe('2026-02-28')
    expect(closingDateFor(c, '2028-02')).toBe('2028-02-29')
    expect(dueDateFor(c, '2026-02')).toBe('2026-03-10')
  })
  it('vencimiento el 30 después de un cierre 31/01 se recorta a 28/02', () => {
    const c = { closingDay: 31, dueDay: 30 }
    expect(closingDateFor(c, '2026-01')).toBe('2026-01-31')
    expect(dueDateFor(c, '2026-01')).toBe('2026-02-28')
  })
  it('cierre y vencimiento el mismo día → vence al mes siguiente', () => {
    const c = { closingDay: 15, dueDay: 15 }
    expect(dueDateFor(c, '2026-09')).toBe('2026-10-15')
  })
})

describe('asignación de la cuota 1 al resumen', () => {
  it('compra el mismo día del cierre entra en ese resumen', () => {
    expect(firstPeriodFor(card, '2026-09-28')).toBe('2026-09')
  })
  it('compra el día después del cierre va al siguiente', () => {
    expect(firstPeriodFor(card, '2026-09-29')).toBe('2026-10')
  })
  it('compra a principio de mes entra en el resumen de ese mes', () => {
    expect(firstPeriodFor(card, '2026-09-01')).toBe('2026-09')
  })
  it('diciembre después del cierre cruza el año', () => {
    expect(firstPeriodFor(card, '2026-12-30')).toBe('2027-01')
  })
  it('febrero con cierre el 30: el 28/02 entra, el 01/03 no', () => {
    const c = { closingDay: 30, dueDay: 10 }
    expect(firstPeriodFor(c, '2026-02-28')).toBe('2026-02')
    expect(firstPeriodFor(c, '2026-03-01')).toBe('2026-03')
  })
  it('currentPeriod es el resumen abierto hoy', () => {
    expect(currentPeriod(card, '2026-09-15')).toBe('2026-09')
    expect(currentPeriod(card, '2026-09-29')).toBe('2026-10')
  })
})

describe('cierres corridos (caso real del banco: 27/Ago→9/Sep, 1/Oct→14/Oct)', () => {
  const overrides: Overrides = new Map<string, DateOverride>([
    ['2026-08', { closingDate: '2026-08-27', dueDate: '2026-09-09' }],
    ['2026-09', { closingDate: '2026-10-01', dueDate: '2026-10-14' }],
  ])
  it('usa las fechas reales', () => {
    expect(statementDates(card, '2026-08', overrides)).toEqual({ period: '2026-08', closingDate: '2026-08-27', dueDate: '2026-09-09' })
    expect(statementDates(card, '2026-09', overrides)).toEqual({ period: '2026-09', closingDate: '2026-10-01', dueDate: '2026-10-14' })
    // Octubre no tiene override: vuelve a la regla
    expect(statementDates(card, '2026-10', overrides)).toEqual({ period: '2026-10', closingDate: '2026-10-28', dueDate: '2026-11-10' })
  })
  it('asigna compras según el cierre real', () => {
    expect(firstPeriodFor(card, '2026-08-27', overrides)).toBe('2026-08')
    expect(firstPeriodFor(card, '2026-08-28', overrides)).toBe('2026-09')
    expect(firstPeriodFor(card, '2026-09-30', overrides)).toBe('2026-09')
    // El 1/10 todavía entra en el resumen de septiembre porque cerró ese día
    expect(firstPeriodFor(card, '2026-10-01', overrides)).toBe('2026-09')
    expect(firstPeriodFor(card, '2026-10-02', overrides)).toBe('2026-10')
  })
  it('override solo de cierre recalcula el vencimiento con la regla', () => {
    const only: Overrides = new Map([['2026-09', { closingDate: '2026-10-01' }]])
    expect(dueDateFor(card, '2026-09', only)).toBe('2026-10-10')
  })
})

describe('estado de pago del resumen', () => {
  it('impago', () => {
    expect(statementStatus(10000, [])).toEqual({ status: 'unpaid', paid: 0, remaining: 10000 })
  })
  it('pago total (o de más)', () => {
    expect(statementStatus(10000, [{ amount: 10000, isMinimum: false }]).status).toBe('paid')
    expect(statementStatus(10000, [{ amount: 12000, isMinimum: false }]).remaining).toBe(0)
  })
  it('parcial y mínimo', () => {
    expect(statementStatus(10000, [{ amount: 4000, isMinimum: false }])).toEqual({ status: 'partial', paid: 4000, remaining: 6000 })
    expect(statementStatus(10000, [{ amount: 1500, isMinimum: true }]).status).toBe('minimum')
  })
  it('varios pagos se suman', () => {
    expect(statementStatus(10000, [{ amount: 4000, isMinimum: false }, { amount: 6000, isMinimum: false }]).status).toBe('paid')
  })
  it('resumen en cero está pago', () => {
    expect(statementStatus(0, []).status).toBe('paid')
  })
})
