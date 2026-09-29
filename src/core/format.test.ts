import { describe, expect, it } from 'vitest'
import { MINUS, NBSP, formatDate, formatDateShort, formatDayHeader, formatMoney, formatMoneyCompact, formatPct, formatPeriod, formatPeriodLong } from './format'

describe('formatDayHeader', () => {
  it('hoy, ayer, mañana y fechas largas', () => {
    expect(formatDayHeader('2026-09-28', '2026-09-28')).toBe('Hoy')
    expect(formatDayHeader('2026-09-27', '2026-09-28')).toBe('Ayer')
    expect(formatDayHeader('2026-09-30', '2026-10-01')).toBe('Ayer')
    expect(formatDayHeader('2026-09-29', '2026-09-28')).toBe('Mañana')
    expect(formatDayHeader('2026-09-26', '2026-09-28')).toBe('Sábado 26 de septiembre')
    expect(formatDayHeader('2025-12-31', '2026-09-28')).toBe('Miércoles 31 de diciembre de 2025')
  })
})

const plain = (s: string) => s.split(NBSP).join(' ')

describe('formatMoney es-AR', () => {
  it('ARS con miles y coma decimal', () => {
    expect(plain(formatMoney(123456))).toBe('$ 1.234,56')
    expect(plain(formatMoney(89999900))).toBe('$ 899.999,00')
  })
  it('USD', () => {
    expect(plain(formatMoney(8000, 'USD'))).toBe('US$ 80,00')
  })
  it('sin centavos', () => {
    expect(plain(formatMoney(123456, 'ARS', { fractionDigits: 0 }))).toBe('$ 1.235')
  })
  it('modo privado', () => {
    expect(plain(formatMoney(123456, 'ARS', { hide: true }))).toBe('$ ••••')
    expect(plain(formatMoney(123456, 'USD', { hide: true }))).toBe('US$ ••••')
  })
  it('negativos y signo', () => {
    expect(plain(formatMoney(-5000))).toBe(`${MINUS}$ 50,00`)
    expect(plain(formatMoney(5000, 'ARS', { signed: true }))).toBe('+$ 50,00')
  })
})

describe('fechas y períodos', () => {
  it('dd/mm/aaaa', () => {
    expect(formatDate('2026-09-27')).toBe('27/09/2026')
  })
  it('corto', () => {
    expect(formatDateShort('2026-09-27')).toBe('27 sep')
  })
  it('período', () => {
    expect(formatPeriod('2026-09')).toBe('Sep 2026')
    expect(formatPeriodLong('2026-09')).toBe('Septiembre 2026')
  })
  it('porcentaje', () => {
    expect(plain(formatPct(0.345))).toBe('34,5 %')
    expect(plain(formatPct(0.6, 0))).toBe('60 %')
  })
})

describe('formatMoneyCompact', () => {
  it('abrevia con sufijos en español', () => {
    const plain = (s: string) => s.split(NBSP).join(' ')
    expect(plain(formatMoneyCompact(123456700))).toBe('$ 1,2 M')
    expect(plain(formatMoneyCompact(4500000))).toBe('$ 45 mil')
    expect(plain(formatMoneyCompact(90000))).toBe('$ 900')
    expect(plain(formatMoneyCompact(5000, 'USD'))).toBe('US$ 50')
  })
})
