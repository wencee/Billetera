import { convertCents } from './money'
import type { Cents } from './types'

export interface LimitInput {
  limit: Cents
  /** Suma de cuotas pendientes en ARS. */
  pendingARS: Cents
  /** Suma de cuotas pendientes en USD. */
  pendingUSD: Cents
  /** Centavos de ARS por USD; 0/undefined si no está cargada. */
  usdRate?: Cents
}

export interface LimitSummary {
  used: Cents
  available: Cents
  /** Fracción usada (puede superar 1). */
  usedPct: number
  /** true si había cuotas en USD y no se pudieron convertir. */
  usdUnconverted: boolean
}

/** Límite disponible = límite − cuotas no pagadas (USD convertido a la cotización cargada). */
export function availableLimit(input: LimitInput): LimitSummary {
  const { limit, pendingARS, pendingUSD, usdRate } = input
  let used = pendingARS
  let usdUnconverted = false
  if (pendingUSD > 0) {
    if (usdRate && usdRate > 0) used += convertCents(pendingUSD, 'USD', 'ARS', usdRate)
    else usdUnconverted = true
  }
  return {
    used,
    available: limit - used,
    usedPct: limit > 0 ? used / limit : 0,
    usdUnconverted,
  }
}
