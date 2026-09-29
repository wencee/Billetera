import { addDays, diffDays, maxDate, minDate } from './dates'
import type { Cents, Currency, ISODate, InvestmentType } from './types'

/** Plazos habituales de un plazo fijo, en días. */
export const FIXED_TERM_DAYS = [30, 60, 90, 180, 365] as const

export interface FixedTermReturn {
  days: number
  interest: Cents
  total: Cents
  /** Tasa efectiva anual si se renueva siempre en el mismo plazo. */
  tea: number
}

/**
 * Plazo fijo tradicional (interés simple, base 365 como en los bancos
 * argentinos): interés = capital × TNA × días / 365.
 */
export function fixedTermReturn(principal: Cents, tna: number, startDate: ISODate, maturityDate: ISODate): FixedTermReturn {
  const days = Math.max(0, diffDays(startDate, maturityDate))
  const interest = Math.round((principal * tna * days) / 365)
  const tea = days > 0 ? Math.pow(1 + (tna * days) / 365, 365 / days) - 1 : 0
  return { days, interest, total: principal + interest, tea }
}

export function maturityFor(startDate: ISODate, days: number): ISODate {
  return addDays(startDate, days)
}

export interface InvestmentLike {
  type: InvestmentType
  amount: Cents
  currency: Currency
  date: ISODate
  tna?: number | undefined
  maturityDate?: ISODate | undefined
  currentValue?: Cents | undefined
  currentValueDate?: ISODate | undefined
  closed: boolean
  closedAt?: ISODate | undefined
  closedAmount?: Cents | undefined
}

export type ValueSource = 'closed' | 'manual' | 'accrued' | 'cost'

export interface InvestmentValue {
  value: Cents
  source: ValueSource
  invested: Cents
  gain: Cents
  /** Ganancia sobre lo invertido (0.05 = 5 %). */
  gainPct: number
}

/**
 * Valor de una inversión hoy:
 * - cerrada: lo que se cobró;
 * - con valuación cargada a mano: esa;
 * - plazo fijo: capital + interés devengado a hoy (tope: el vencimiento);
 * - si no, lo invertido.
 */
export function investmentValue(inv: InvestmentLike, today: ISODate): InvestmentValue {
  let value = inv.amount
  let source: ValueSource = 'cost'
  if (inv.closed && inv.closedAmount !== undefined) {
    value = inv.closedAmount
    source = 'closed'
  } else if (inv.currentValue !== undefined) {
    value = inv.currentValue
    source = 'manual'
  } else if (inv.type === 'plazo_fijo' && inv.tna !== undefined && inv.maturityDate) {
    const until = maxDate(inv.date, minDate(today, inv.maturityDate))
    value = fixedTermReturn(inv.amount, inv.tna, inv.date, until).total
    source = 'accrued'
  }
  const gain = value - inv.amount
  return { value, source, invested: inv.amount, gain, gainPct: inv.amount > 0 ? gain / inv.amount : 0 }
}

export interface PortfolioTotals {
  invested: Record<Currency, Cents>
  value: Record<Currency, Cents>
}

/** Totales de las inversiones abiertas, por moneda. */
export function portfolioTotals(investments: readonly InvestmentLike[], today: ISODate): PortfolioTotals {
  const totals: PortfolioTotals = { invested: { ARS: 0, USD: 0 }, value: { ARS: 0, USD: 0 } }
  for (const inv of investments) {
    if (inv.closed) continue
    const v = investmentValue(inv, today)
    totals.invested[inv.currency] += inv.amount
    totals.value[inv.currency] += v.value
  }
  return totals
}

export type MaturityState = 'upcoming' | 'today' | 'matured'

/** Plazos fijos abiertos que vencen dentro de `days` días (o ya vencieron y no se cerraron). */
export function maturingSoon<T extends InvestmentLike>(investments: readonly T[], today: ISODate, days: number): { investment: T; state: MaturityState; daysLeft: number }[] {
  const limit = addDays(today, days)
  return investments
    .filter((i) => !i.closed && i.maturityDate && i.maturityDate <= limit)
    .map((investment) => {
      const daysLeft = diffDays(today, investment.maturityDate!)
      const state: MaturityState = daysLeft > 0 ? 'upcoming' : daysLeft === 0 ? 'today' : 'matured'
      return { investment, state, daysLeft }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export interface NetWorth {
  accounts: Record<Currency, Cents>
  goals: Record<Currency, Cents>
  investments: Record<Currency, Cents>
  total: Record<Currency, Cents>
  /** Todo en pesos a la cotización cargada; null si hay dólares y no hay cotización. */
  totalARS: Cents | null
}

/** Patrimonio = saldo de cuentas + ahorrado en metas + valor de inversiones abiertas. */
export function netWorth(
  parts: { accounts: Record<Currency, Cents>; goals: Record<Currency, Cents>; investments: Record<Currency, Cents> },
  usdRate: Cents = 0,
): NetWorth {
  const total = {
    ARS: parts.accounts.ARS + parts.goals.ARS + parts.investments.ARS,
    USD: parts.accounts.USD + parts.goals.USD + parts.investments.USD,
  }
  const totalARS = total.USD === 0 ? total.ARS : usdRate > 0 ? total.ARS + Math.round((total.USD * usdRate) / 100) : null
  return { ...parts, total, totalARS }
}
