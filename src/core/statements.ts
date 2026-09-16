import { addPeriods, dateInPeriod, makeISODate, makePeriod, periodOf, periodParts } from './dates'
import type { Cents, ISODate, Period } from './types'

/** Lo único que necesita el motor de resúmenes de una tarjeta. */
export interface CardCycle {
  closingDay: number
  dueDay: number
}

export interface DateOverride {
  closingDate?: ISODate
  dueDate?: ISODate
}

/** Correcciones manuales por período (cierres corridos por feriados, etc.). */
export type Overrides = ReadonlyMap<Period, DateOverride> | undefined

/** Fecha real de cierre del resumen `period`: override o el día de cierre recortado al mes. */
export function closingDateFor(card: CardCycle, period: Period, overrides?: Overrides): ISODate {
  return overrides?.get(period)?.closingDate ?? dateInPeriod(period, card.closingDay)
}

/**
 * Fecha real de vencimiento: override, o el primer `dueDay` estrictamente
 * posterior a la fecha de cierre (cierre 28/09 y vence el 10 → 10/10;
 * cierre 05/09 y vence el 20 → 20/09).
 */
export function dueDateFor(card: CardCycle, period: Period, overrides?: Overrides): ISODate {
  const override = overrides?.get(period)?.dueDate
  if (override) return override
  const closing = closingDateFor(card, period, overrides)
  const { year, month } = periodParts(periodOf(closing))
  const sameMonth = makeISODate(year, month, card.dueDay)
  if (sameMonth > closing) return sameMonth
  return dateInPeriod(addPeriods(makePeriod(year, month), 1), card.dueDay)
}

/**
 * Período en el que cae la cuota 1 de una compra hecha en `purchaseDate`:
 * el primer resumen cuyo cierre es igual o posterior a la compra.
 * Se mira también el período anterior porque un cierre corrido (override)
 * puede caer en el mes siguiente (cierre de septiembre el 1/10).
 */
export function firstPeriodFor(card: CardCycle, purchaseDate: ISODate, overrides?: Overrides): Period {
  const p = periodOf(purchaseDate)
  for (const candidate of [addPeriods(p, -1), p, addPeriods(p, 1)]) {
    if (purchaseDate <= closingDateFor(card, candidate, overrides)) return candidate
  }
  return addPeriods(p, 2)
}

export interface StatementDates {
  period: Period
  closingDate: ISODate
  dueDate: ISODate
}

export function statementDates(card: CardCycle, period: Period, overrides?: Overrides): StatementDates {
  return {
    period,
    closingDate: closingDateFor(card, period, overrides),
    dueDate: dueDateFor(card, period, overrides),
  }
}

/** Resumen abierto hoy (el próximo en cerrar). El anterior es el último cerrado. */
export function currentPeriod(card: CardCycle, today: ISODate, overrides?: Overrides): Period {
  return firstPeriodFor(card, today, overrides)
}

export type StatementStatus = 'unpaid' | 'minimum' | 'partial' | 'paid'

export interface PaymentSummary {
  status: StatementStatus
  paid: Cents
  remaining: Cents
}

/**
 * Estado de pago derivado de los pagos registrados contra el total en ARS del
 * resumen. Un pago de tipo 'total' lo deja pago aunque el monto no coincida.
 */
export function statementStatus(
  total: Cents,
  payments: readonly { amount: Cents; kind: 'total' | 'partial' | 'minimum' }[],
): PaymentSummary {
  let paid = 0
  let anyMinimum = false
  let anyTotal = false
  for (const p of payments) {
    paid += p.amount
    if (p.kind === 'minimum') anyMinimum = true
    if (p.kind === 'total') anyTotal = true
  }
  const remaining = anyTotal ? 0 : Math.max(0, total - paid)
  let status: StatementStatus
  if (anyTotal || total <= 0 || paid >= total) status = 'paid'
  else if (paid <= 0) status = 'unpaid'
  else status = anyMinimum ? 'minimum' : 'partial'
  return { status, paid, remaining }
}

export interface CurrencyTotals {
  ARS: Cents
  USD: Cents
}

/** Suma montos por moneda. */
export function sumByCurrency(items: Iterable<{ amount: Cents; currency: 'ARS' | 'USD' }>): CurrencyTotals {
  const t: CurrencyTotals = { ARS: 0, USD: 0 }
  for (const i of items) t[i.currency] += i.amount
  return t
}

export interface StatementSummary extends StatementDates {
  totals: CurrencyTotals
  /** Cantidad de cuotas que caen en el período. */
  count: number
  /** true si la fecha de cierre ya pasó. */
  closed: boolean
  /** Estado de pago; para resúmenes abiertos siempre 'unpaid' salvo que haya pagos. */
  payment: PaymentSummary
}

/**
 * Resumen de un período: fechas, totales por moneda y estado de pago.
 * El estado compara los pagos contra el total en ARS más el USD convertido
 * (si hay cotización); un pago 'total' lo deja pago de todos modos.
 */
export function summarizeStatement(params: {
  card: CardCycle
  period: Period
  installments: readonly { period: Period; amount: Cents; currency: 'ARS' | 'USD' }[]
  payments: readonly { period: Period; amount: Cents; kind: 'total' | 'partial' | 'minimum' }[]
  today: ISODate
  overrides?: Overrides
  usdRate?: Cents
}): StatementSummary {
  const { card, period, installments, payments, today, overrides, usdRate } = params
  const dates = statementDates(card, period, overrides)
  const inPeriod = installments.filter((i) => i.period === period)
  const totals = sumByCurrency(inPeriod)
  const usdInArs = usdRate && usdRate > 0 ? Math.round((totals.USD * usdRate) / 100) : 0
  const payment = statementStatus(totals.ARS + usdInArs, payments.filter((p) => p.period === period))
  return { ...dates, totals, count: inPeriod.length, closed: dates.closingDate < today, payment }
}
