import { addDays, addPeriods, comparePeriods, maxDate, periodsBetween } from './dates'
import { splitEvenly } from './money'
import { occurrencesBetween, type RecurrenceRule } from './recurring'
import { closingDateFor, firstPeriodFor, type CardCycle, type Overrides } from './statements'
import type { Cents, Currency, ISODate, Period } from './types'

export interface CurrencyTotals {
  ARS: Cents
  USD: Cents
}

export interface CommitmentRow {
  period: Period
  byCard: Record<string, CurrencyTotals>
  total: CurrencyTotals
}

export interface ProjectionCard extends CardCycle {
  id: string
}

export interface ProjectionInstallment {
  cardId: string
  period: Period
  amount: Cents
  currency: Currency
}

/** Gasto fijo/suscripción que se cobra con tarjeta y todavía no se materializó. */
export interface ProjectionRecurring extends RecurrenceRule {
  cardId: string
  amount: Cents
  currency: Currency
  installments?: number | undefined
  lastGeneratedUntil?: ISODate | undefined
  active: boolean
}

export interface ProjectionInput {
  cards: readonly ProjectionCard[]
  /** Solo cuotas pendientes. */
  installments: readonly ProjectionInstallment[]
  recurring?: readonly ProjectionRecurring[]
  fromPeriod: Period
  months?: number
  today: ISODate
  overridesFor?: (cardId: string) => Overrides
}

function emptyTotals(): CurrencyTotals {
  return { ARS: 0, USD: 0 }
}

/**
 * "Compromisos futuros": cuánto cae en cada uno de los próximos `months`
 * resúmenes, por tarjeta y en total. Suma las cuotas ya generadas más las
 * ocurrencias proyectadas de suscripciones con tarjeta que aún no se generaron.
 */
export function projectCommitments(input: ProjectionInput): CommitmentRow[] {
  const { cards, installments, recurring = [], fromPeriod, months = 12, today, overridesFor } = input
  const lastPeriod = addPeriods(fromPeriod, months - 1)
  const rows = new Map<Period, CommitmentRow>()
  for (const period of periodsBetween(fromPeriod, lastPeriod)) {
    rows.set(period, { period, byCard: {}, total: emptyTotals() })
  }

  const add = (period: Period, cardId: string, currency: Currency, amount: Cents) => {
    const row = rows.get(period)
    if (!row) return
    const card = (row.byCard[cardId] ??= emptyTotals())
    card[currency] += amount
    row.total[currency] += amount
  }

  for (const i of installments) add(i.period, i.cardId, i.currency, i.amount)

  const cardsById = new Map(cards.map((c) => [c.id, c]))
  for (const rule of recurring) {
    if (!rule.active) continue
    const card = cardsById.get(rule.cardId)
    if (!card) continue
    const overrides = overridesFor?.(rule.cardId)
    const from = rule.lastGeneratedUntil ? maxDate(today, addDays(rule.lastGeneratedUntil, 1)) : today
    const to = closingDateFor(card, lastPeriod, overrides)
    if (from > to) continue
    const count = Math.max(1, rule.installments ?? 1)
    for (const date of occurrencesBetween(rule, from, to)) {
      const first = firstPeriodFor(card, date, overrides)
      splitEvenly(rule.amount, count).forEach((amount, idx) => {
        const period = addPeriods(first, idx)
        if (comparePeriods(period, lastPeriod) <= 0) add(period, rule.cardId, rule.currency, amount)
      })
    }
  }

  return [...rows.values()]
}
