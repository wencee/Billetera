import { addPeriods } from './dates'
import { dueDateFor, type CardCycle, type Overrides } from './statements'
import type { Cents, InstallmentStatus, ISODate, Period } from './types'

export interface ScheduleEntry {
  number: number
  count: number
  amount: Cents
  period: Period
  dueDate: ISODate
}

/**
 * Cronograma de cuotas: la cuota k cae en `firstPeriod + (k-1)` meses y vence
 * cuando vence ese resumen. `amounts` ya viene repartido (ver interest.ts).
 */
export function buildSchedule(params: {
  amounts: readonly Cents[]
  firstPeriod: Period
  card: CardCycle
  overrides?: Overrides
}): ScheduleEntry[] {
  const { amounts, firstPeriod, card, overrides } = params
  if (amounts.length === 0) throw new RangeError('Se necesita al menos una cuota')
  return amounts.map((amount, idx) => {
    const period = addPeriods(firstPeriod, idx)
    return {
      number: idx + 1,
      count: amounts.length,
      amount,
      period,
      dueDate: dueDateFor(card, period, overrides),
    }
  })
}

export function installmentLabel(number: number, count: number): string {
  return `${number}/${count}`
}

export interface InstallmentLike {
  amount: Cents
  status: InstallmentStatus
}

export function pendingBalance(installments: Iterable<InstallmentLike>): Cents {
  let total = 0
  for (const i of installments) if (i.status === 'pending') total += i.amount
  return total
}

export function paidCount(installments: Iterable<InstallmentLike>): number {
  let n = 0
  for (const i of installments) if (i.status === 'paid') n++
  return n
}
