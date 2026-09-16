import { addDays, dateInPeriod, dateParts, makeISODate, maxDate, minDate, periodOf, periodsBetween, weekday } from './dates'
import type { Frequency, ISODate } from './types'

export interface RecurrenceRule {
  frequency: Frequency
  /** Mensual/anual: día del mes (recortado). Semanal: día de la semana (0 = domingo). */
  day: number
  startDate: ISODate
  endDate?: ISODate | undefined
}

/**
 * Fechas en que ocurre la regla dentro de [from, to] (inclusive), respetando
 * startDate/endDate. Para "anual" se usa el mes de startDate.
 */
export function occurrencesBetween(rule: RecurrenceRule, from: ISODate, to: ISODate): ISODate[] {
  const start = maxDate(from, rule.startDate)
  const end = rule.endDate ? minDate(to, rule.endDate) : to
  if (start > end) return []
  const out: ISODate[] = []

  switch (rule.frequency) {
    case 'monthly': {
      for (const period of periodsBetween(periodOf(start), periodOf(end))) {
        const date = dateInPeriod(period, rule.day)
        if (date >= start && date <= end) out.push(date)
      }
      break
    }
    case 'weekly': {
      const target = ((rule.day % 7) + 7) % 7
      let date = start
      // Avanzar hasta el primer día de la semana que coincide, después de a 7.
      while (weekday(date) !== target) date = addDays(date, 1)
      for (; date <= end; date = addDays(date, 7)) out.push(date)
      break
    }
    case 'yearly': {
      const { month } = dateParts(rule.startDate)
      const firstYear = dateParts(start).year
      const lastYear = dateParts(end).year
      for (let year = firstYear; year <= lastYear; year++) {
        const date = makeISODate(year, month, rule.day)
        if (date >= start && date <= end) out.push(date)
      }
      break
    }
  }
  return out
}

/** Próxima ocurrencia estrictamente posterior a `after`, o null si la regla terminó. */
export function nextOccurrence(rule: RecurrenceRule, after: ISODate): ISODate | null {
  const from = addDays(after, 1)
  const horizon = addDays(from, rule.frequency === 'yearly' ? 366 : 62)
  return occurrencesBetween(rule, from, horizon)[0] ?? null
}
