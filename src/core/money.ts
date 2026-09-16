import type { Cents, Currency } from './types'

export function toCents(amount: number): Cents {
  return Math.round(amount * 100)
}

export function fromCents(cents: Cents): number {
  return cents / 100
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0
  for (const v of values) total += v
  return total
}

/**
 * Reparte `total` en `parts` montos enteros. Todas las partes reciben la
 * división truncada y la última absorbe el resto, así la suma es exacta.
 * splitEvenly(10000, 3) → [3333, 3333, 3334]
 */
export function splitEvenly(total: Cents, parts: number): Cents[] {
  if (!Number.isInteger(parts) || parts < 1) throw new RangeError('parts debe ser un entero >= 1')
  if (!Number.isInteger(total)) throw new RangeError('total debe ser un entero en centavos')
  const base = Math.trunc(total / parts)
  const result = new Array<Cents>(parts).fill(base)
  result[parts - 1] = total - base * (parts - 1)
  return result
}

/**
 * Convierte texto es-AR a centavos. Acepta "1.234,56", "1234,56", "1234.56",
 * "1.234" (miles) y "$ 1.234,56". Devuelve null si no es un número.
 */
export function parseAmount(input: string): Cents | null {
  const s = input.replace(/\s|\$|US\$|U\$S/g, '').trim()
  if (!s) return null
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  let normalized: string
  if (hasComma && hasDot) {
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    normalized = s.replace(',', '.')
  } else if (hasDot) {
    // Un solo punto con 1 o 2 decimales → decimal; si no, separador de miles.
    const parts = s.split('.')
    const decimals = parts[1] ?? ''
    normalized = parts.length === 2 && decimals.length > 0 && decimals.length <= 2 ? s : s.replace(/\./g, '')
  } else {
    normalized = s
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

/**
 * Convierte entre monedas. `usdRate` son centavos de ARS por 1 USD
 * (1450,00 $/USD → 145000).
 */
export function convertCents(amount: Cents, from: Currency, to: Currency, usdRate: Cents): Cents {
  if (from === to) return amount
  if (!(usdRate > 0)) throw new Error('Cotización del dólar no cargada')
  return from === 'USD' ? Math.round((amount * usdRate) / 100) : Math.round((amount * 100) / usdRate)
}

/** Fracción (0-1) de `part` sobre `whole`; 0 si `whole` es 0. */
export function ratio(part: Cents, whole: Cents): number {
  return whole === 0 ? 0 : part / whole
}
