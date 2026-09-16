import { describe, expect, it } from 'vitest'
import { convertCents, parseAmount, splitEvenly, sumCents, toCents } from './money'

describe('splitEvenly', () => {
  it('reparte exacto y la última cuota absorbe el redondeo', () => {
    expect(splitEvenly(10000, 3)).toEqual([3333, 3333, 3334])
  })
  it('1 cuota devuelve el total', () => {
    expect(splitEvenly(89999900, 1)).toEqual([89999900])
  })
  it('24 cuotas suman exacto', () => {
    const parts = splitEvenly(123456789, 24)
    expect(parts).toHaveLength(24)
    expect(sumCents(parts)).toBe(123456789)
    expect(new Set(parts.slice(0, 23)).size).toBe(1)
  })
  it('$ 899.999 en 12 sin interés', () => {
    const parts = splitEvenly(89999900, 12)
    expect(parts[0]).toBe(7499991)
    expect(parts[11]).toBe(7499999)
    expect(sumCents(parts)).toBe(89999900)
  })
  it('rechaza partes inválidas', () => {
    expect(() => splitEvenly(100, 0)).toThrow()
    expect(() => splitEvenly(100.5, 2)).toThrow()
  })
})

describe('parseAmount (es-AR)', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234.56', 123456],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['1,5', 150],
    ['1.5', 150],
    ['$ 1.234,56', 123456],
    ['US$ 80', 8000],
    ['0,99', 99],
    ['1000', 100000],
  ])('%s → %i', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })
  it('devuelve null para texto inválido', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1,2,3')).toBeNull()
  })
})

describe('convertCents', () => {
  const rate = 145000 // $ 1.450,00 por USD
  it('USD → ARS', () => {
    expect(convertCents(8000, 'USD', 'ARS', rate)).toBe(11600000)
  })
  it('ARS → USD', () => {
    expect(convertCents(11600000, 'ARS', 'USD', rate)).toBe(8000)
  })
  it('misma moneda no toca el monto', () => {
    expect(convertCents(500, 'ARS', 'ARS', 0)).toBe(500)
  })
  it('sin cotización tira error', () => {
    expect(() => convertCents(100, 'USD', 'ARS', 0)).toThrow()
  })
})

describe('toCents', () => {
  it('redondea a centavos', () => {
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(1234.565)).toBe(123457)
  })
})
