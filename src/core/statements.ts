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

/** Estado de pago derivado de los pagos registrados contra el total del resumen. */
export function statementStatus(
  total: Cents,
  payments: readonly { amount: Cents; isMinimum: boolean }[],
): PaymentSummary {
  let paid = 0
  let anyMinimum = false
  for (const p of payments) {
    paid += p.amount
    if (p.isMinimum) anyMinimum = true
  }
  const remaining = Math.max(0, total - paid)
  let status: StatementStatus
  if (total <= 0 || paid >= total) status = 'paid'
  else if (paid <= 0) status = 'unpaid'
  else status = anyMinimum ? 'minimum' : 'partial'
  return { status, paid, remaining }
}
