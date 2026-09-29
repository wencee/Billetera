import { addDays, diffDays, firstDayOfPeriod, lastDayOfPeriod, maxDate, periodOf } from './dates'
import { occurrencesBetween, type RecurrenceRule } from './recurring'
import type { Cents, Currency, ISODate, Period } from './types'

export interface MonthOverviewInput {
  month: Period
  today: ISODate
  incomes: readonly { amount: Cents; currency: Currency; date: ISODate }[]
  expenses: readonly { amount: Cents; currency: Currency; date: ISODate }[]
  /** Fijos activos. Los que van con tarjeta se ignoran: ya están en los resúmenes. */
  recurring: readonly (RecurrenceRule & {
    kind: 'expense' | 'income'
    amount: Cents
    currency: Currency
    method: string
    active: boolean
    lastGeneratedUntil?: ISODate | undefined
  })[]
  /** Total en pesos de cada resumen de tarjeta que vence este mes. */
  cardsDue: readonly Cents[]
  usdRate?: Cents
}

export interface MonthOverview {
  income: { received: Cents; expected: Cents }
  spent: { done: Cents; expectedFixed: Cents }
  cards: Cents
  /** Ingresos (cobrados + por cobrar) − gastos (hechos + fijos que faltan) − tarjetas que vencen. */
  available: Cents
  /** Días que quedan del mes, contando hoy. */
  daysLeft: number
  /** Cuánto se puede gastar por día para no pasarse (null si no queda nada). */
  perDay: Cents | null
  /** true si hubo montos en dólares que no se pudieron convertir. */
  unconvertedUSD: boolean
}

/**
 * "Disponible del mes": una foto de caja en pesos del mes calendario.
 * No resta lo que se puso en metas o inversiones (esa plata sigue siendo tuya).
 */
export function monthOverview(input: MonthOverviewInput): MonthOverview {
  const { month, today, usdRate = 0 } = input
  let unconvertedUSD = false
  const ars = (amount: Cents, currency: Currency): Cents => {
    if (currency === 'ARS') return amount
    if (usdRate > 0) return Math.round((amount * usdRate) / 100)
    unconvertedUSD = true
    return 0
  }
  const inMonth = (date: ISODate) => periodOf(date) === month
  const received = input.incomes.filter((i) => inMonth(i.date) && i.date <= today).reduce((s, i) => s + ars(i.amount, i.currency), 0)
  const done = input.expenses.filter((e) => inMonth(e.date) && e.date <= today).reduce((s, e) => s + ars(e.amount, e.currency), 0)

  // Fijos que todavía no se generaron y caen de mañana hasta fin de mes.
  const end = lastDayOfPeriod(month)
  let expectedIncome = 0
  let expectedFixed = 0
  for (const r of input.recurring) {
    if (!r.active || r.method === 'card') continue
    const from = maxDate(maxDate(addDays(today, 1), firstDayOfPeriod(month)), r.lastGeneratedUntil ? addDays(r.lastGeneratedUntil, 1) : r.startDate)
    const count = occurrencesBetween(r, from, end).length
    if (count === 0) continue
    const amount = ars(r.amount, r.currency) * count
    if (r.kind === 'income') expectedIncome += amount
    else expectedFixed += amount
  }

  const cards = input.cardsDue.reduce((s, c) => s + c, 0)
  const available = received + expectedIncome - done - expectedFixed - cards
  const daysLeft = today > end ? 0 : Math.max(1, diffDays(maxDate(today, firstDayOfPeriod(month)), end) + 1)
  return {
    income: { received, expected: expectedIncome },
    spent: { done, expectedFixed },
    cards,
    available,
    daysLeft,
    perDay: available > 0 && daysLeft > 0 ? Math.floor(available / daysLeft / 100) * 100 : null,
    unconvertedUSD,
  }
}
