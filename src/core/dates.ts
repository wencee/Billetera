import type { ISODate, Period } from './types'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const PERIOD = /^(\d{4})-(\d{2})$/

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function isISODate(s: string): s is ISODate {
  return ISO_DATE.test(s)
}

/** Parsea 'YYYY-MM-DD' como fecha local (sin corrimientos de zona horaria). */
export function parseISODate(s: ISODate): Date {
  const m = ISO_DATE.exec(s)
  if (!m) throw new RangeError(`Fecha inválida: ${s}`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Recorta el día al último del mes (cierre el 30 en febrero → 28/29). */
export function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month))
}

export function makeISODate(year: number, month: number, day: number): ISODate {
  return `${year}-${pad2(month)}-${pad2(clampDay(year, month, day))}`
}

export function dateParts(date: ISODate): { year: number; month: number; day: number } {
  const m = ISO_DATE.exec(date)
  if (!m) throw new RangeError(`Fecha inválida: ${date}`)
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

export function addDays(date: ISODate, n: number): ISODate {
  const d = parseISODate(date)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Suma meses recortando el día (31/01 + 1 → 28/02). */
export function addMonths(date: ISODate, n: number): ISODate {
  const { year, month, day } = dateParts(date)
  const total = year * 12 + (month - 1) + n
  return makeISODate(Math.floor(total / 12), (total % 12) + 1, day)
}

export function diffDays(from: ISODate, to: ISODate): number {
  const a = parseISODate(from)
  const b = parseISODate(to)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** 0 = domingo … 6 = sábado */
export function weekday(date: ISODate): number {
  return parseISODate(date).getDay()
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b
}

// ---------- Períodos 'YYYY-MM' ----------

export function makePeriod(year: number, month: number): Period {
  return `${year}-${pad2(month)}`
}

export function periodParts(period: Period): { year: number; month: number } {
  const m = PERIOD.exec(period)
  if (!m) throw new RangeError(`Período inválido: ${period}`)
  return { year: Number(m[1]), month: Number(m[2]) }
}

export function periodOf(date: ISODate): Period {
  return date.slice(0, 7)
}

export function addPeriods(period: Period, n: number): Period {
  const { year, month } = periodParts(period)
  const total = year * 12 + (month - 1) + n
  return makePeriod(Math.floor(total / 12), (total % 12) + 1)
}

/** Orden cronológico; los strings 'YYYY-MM' ordenan bien lexicográficamente. */
export function comparePeriods(a: Period, b: Period): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Lista inclusiva de períodos entre `from` y `to`. */
export function periodsBetween(from: Period, to: Period): Period[] {
  const out: Period[] = []
  for (let p = from; comparePeriods(p, to) <= 0; p = addPeriods(p, 1)) out.push(p)
  return out
}

/** Fecha del `day` dentro del período, recortado al mes. */
export function dateInPeriod(period: Period, day: number): ISODate {
  const { year, month } = periodParts(period)
  return makeISODate(year, month, day)
}

export function firstDayOfPeriod(period: Period): ISODate {
  return dateInPeriod(period, 1)
}

export function lastDayOfPeriod(period: Period): ISODate {
  return dateInPeriod(period, 31)
}
