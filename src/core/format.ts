import { format as formatDateFns } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseISODate, periodParts } from './dates'
import type { Cents, Currency, ISODate, Period } from './types'

const LOCALE = 'es-AR'

const moneyFormatters: Record<Currency, Record<'2' | '0', Intl.NumberFormat>> = {
  ARS: {
    '2': new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '0': new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  },
  USD: {
    '2': new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '0': new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  },
}

/** Espacio duro: el mismo que usa Intl entre el símbolo y la cifra. */
export const NBSP = String.fromCharCode(160)

export const CURRENCY_SYMBOL: Record<Currency, string> = { ARS: '$', USD: 'US$' }

export interface MoneyFormatOptions {
  /** Modo privado: reemplaza las cifras por puntos. */
  hide?: boolean
  /** Sin centavos (para cifras grandes en tarjetas y resúmenes). */
  fractionDigits?: 0 | 2
  /** Anteponer signo + a los positivos. */
  signed?: boolean
}

/** $ 1.234,56 · US$ 80,00 · en modo privado "$ ••••". */
export function formatMoney(cents: Cents, currency: Currency = 'ARS', opts: MoneyFormatOptions = {}): string {
  const { hide = false, fractionDigits = 2, signed = false } = opts
  if (hide) return `${CURRENCY_SYMBOL[currency]}${NBSP}••••`
  const formatted = moneyFormatters[currency][fractionDigits === 0 ? '0' : '2'].format(cents / 100)
  return signed && cents > 0 ? `+${formatted}` : formatted
}

const numberFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })

export function formatNumber(n: number): string {
  return numberFormatter.format(n)
}

/** 0.345 → "34,5 %" */
export function formatPct(fraction: number, digits = 1): string {
  const value = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(fraction * 100)
  return `${value} %`
}

/** 2026-09-27 → 27/09/2026 */
export function formatDate(date: ISODate): string {
  return formatDateFns(parseISODate(date), 'dd/MM/yyyy')
}

/** 2026-09-27 → "27 sep" */
export function formatDateShort(date: ISODate): string {
  return formatDateFns(parseISODate(date), 'd MMM', { locale: es }).replace('.', '')
}

/** 2026-09-27 → "sábado 27 de septiembre" */
export function formatDateLong(date: ISODate): string {
  return formatDateFns(parseISODate(date), "EEEE d 'de' MMMM", { locale: es })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** 2026-09 → "Sep 2026" */
export function formatPeriod(period: Period): string {
  const { year, month } = periodParts(period)
  return capitalize(formatDateFns(new Date(year, month - 1, 1), 'MMM yyyy', { locale: es }).replace('.', ''))
}

/** 2026-09 → "Septiembre 2026" */
export function formatPeriodLong(period: Period): string {
  const { year, month } = periodParts(period)
  return capitalize(formatDateFns(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es }))
}
