import { splitEvenly } from './money'
import type { Cents, Financing, InterestInput } from './types'

/**
 * Cuota del sistema francés (sin redondear, en centavos):
 *   C = P · i / (1 − (1 + i)^−n)
 * con `monthlyRate` como fracción mensual (TNA/12).
 */
export function installmentForRate(principal: Cents, monthlyRate: number, count: number): number {
  if (count < 1) throw new RangeError('count debe ser >= 1')
  if (monthlyRate === 0) return principal / count
  const q = Math.pow(1 + monthlyRate, -count)
  return (principal * monthlyRate) / (1 - q)
}

/**
 * Tasa mensual implícita dada la cuota (inversa de `installmentForRate`).
 * Se resuelve por bisección: la función es monótona creciente en i, así que
 * converge siempre, a diferencia de Newton. Devuelve 0 si no hay recargo.
 */
export function solveMonthlyRate(principal: Cents, installment: number, count: number): number {
  if (principal <= 0) throw new RangeError('principal debe ser > 0')
  if (count < 1) throw new RangeError('count debe ser >= 1')
  if (installment * count <= principal) return 0
  let lo = 0
  let hi = 1
  while (installmentForRate(principal, hi, count) < installment && hi < 1e6) hi *= 2
  for (let k = 0; k < 200 && hi - lo > 1e-13; k++) {
    const mid = (lo + hi) / 2
    if (installmentForRate(principal, mid, count) < installment) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** TNA (nominal, i·12) y TEA (efectiva, (1+i)^12 − 1) a partir de la tasa mensual. */
export function annualize(monthlyRate: number): { tna: number; tea: number } {
  return { tna: monthlyRate * 12, tea: Math.pow(1 + monthlyRate, 12) - 1 }
}

export interface FinancingAnalysis {
  /** Monto de cada cuota, ya repartido (la última puede absorber redondeo). */
  installments: Cents[]
  /** Cuota "típica" para mostrar (la primera). */
  installmentAmount: Cents
  totalAmount: Cents
  /** total − contado. Puede ser negativo si el plan sale más barato que el contado. */
  totalInterest: Cents
  /** Recargo sobre el contado, como fracción (0.34 = 34 %). */
  surchargePct: number
  monthlyRate: number
  tna: number
  tea: number
}

export interface FinancingInput {
  cashPrice: Cents
  count: number
  financing: Financing
  interestInput?: InterestInput
}

/**
 * Calcula cuotas, total, interés y tasas para cualquiera de las tres formas de
 * cargar una financiación. Las tasas siempre se derivan del dinero real
 * (total / n contra el contado), así lo que se muestra coincide con lo que se paga.
 */
export function analyzeFinancing(input: FinancingInput): FinancingAnalysis {
  const { cashPrice, count, financing, interestInput } = input
  if (!Number.isInteger(count) || count < 1) throw new RangeError('La cantidad de cuotas debe ser un entero >= 1')
  if (!Number.isInteger(cashPrice) || cashPrice <= 0) throw new RangeError('El precio de contado debe ser > 0')

  let installments: Cents[]
  if (financing === 'none' || !interestInput) {
    installments = splitEvenly(cashPrice, count)
  } else {
    switch (interestInput.mode) {
      case 'installment': {
        const each = Math.round(interestInput.value)
        if (each <= 0) throw new RangeError('El valor de la cuota debe ser > 0')
        installments = new Array<Cents>(count).fill(each)
        break
      }
      case 'total': {
        const total = Math.round(interestInput.value)
        if (total <= 0) throw new RangeError('El total financiado debe ser > 0')
        installments = splitEvenly(total, count)
        break
      }
      case 'tna': {
        if (interestInput.value < 0) throw new RangeError('La TNA no puede ser negativa')
        const each = Math.round(installmentForRate(cashPrice, interestInput.value / 12, count))
        installments = new Array<Cents>(count).fill(each)
        break
      }
    }
  }

  const totalAmount = installments.reduce((a, b) => a + b, 0)
  const monthlyRate = solveMonthlyRate(cashPrice, totalAmount / count, count)
  const { tna, tea } = annualize(monthlyRate)
  return {
    installments,
    installmentAmount: installments[0] ?? 0,
    totalAmount,
    totalInterest: totalAmount - cashPrice,
    surchargePct: (totalAmount - cashPrice) / cashPrice,
    monthlyRate,
    tna,
    tea,
  }
}
