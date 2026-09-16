import { describe, expect, it } from 'vitest'
import {
  addDays, addMonths, addPeriods, clampDay, dateInPeriod, daysInMonth, diffDays,
  parseISODate, periodOf, periodsBetween, toISODate, weekday,
} from './dates'

describe('fechas', () => {
  it('febrero: 2026 tiene 28, 2028 tiene 29', () => {
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(clampDay(2026, 2, 30)).toBe(28)
    expect(clampDay(2028, 2, 30)).toBe(29)
  })
  it('parse/format sin corrimiento de zona horaria', () => {
    expect(toISODate(parseISODate('2026-09-15'))).toBe('2026-09-15')
    expect(toISODate(parseISODate('2026-01-01'))).toBe('2026-01-01')
  })
  it('addMonths recorta el día', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28')
    expect(addMonths('2026-03-15', -1)).toBe('2026-02-15')
  })
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('diffDays', () => {
    expect(diffDays('2026-09-15', '2026-09-27')).toBe(12)
    expect(diffDays('2026-09-27', '2026-09-15')).toBe(-12)
  })
  it('weekday: 15/09/2026 es martes', () => {
    expect(weekday('2026-09-15')).toBe(2)
  })
})

describe('períodos', () => {
  it('periodOf y addPeriods cruzan el año', () => {
    expect(periodOf('2026-09-15')).toBe('2026-09')
    expect(addPeriods('2026-11', 3)).toBe('2027-02')
    expect(addPeriods('2026-01', -1)).toBe('2025-12')
    expect(addPeriods('2026-12', 12)).toBe('2027-12')
  })
  it('dateInPeriod recorta', () => {
    expect(dateInPeriod('2026-02', 31)).toBe('2026-02-28')
    expect(dateInPeriod('2026-09', 5)).toBe('2026-09-05')
  })
  it('periodsBetween es inclusivo', () => {
    expect(periodsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
    expect(periodsBetween('2026-11', '2026-10')).toEqual([])
  })
})
