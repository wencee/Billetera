import { describe, expect, it } from 'vitest'
import { nextOccurrence, occurrencesBetween } from './recurring'

describe('occurrencesBetween', () => {
  it('mensual el 31 se recorta en meses cortos', () => {
    const rule = { frequency: 'monthly' as const, day: 31, startDate: '2026-01-01' }
    expect(occurrencesBetween(rule, '2026-01-15', '2026-04-30')).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30',
    ])
  })
  it('mensual respeta startDate y endDate', () => {
    const rule = { frequency: 'monthly' as const, day: 10, startDate: '2026-09-15', endDate: '2026-11-30' }
    expect(occurrencesBetween(rule, '2026-01-01', '2027-12-31')).toEqual(['2026-10-10', '2026-11-10'])
  })
  it('semanal: lunes desde un martes', () => {
    const rule = { frequency: 'weekly' as const, day: 1, startDate: '2026-01-01' }
    expect(occurrencesBetween(rule, '2026-09-15', '2026-10-06')).toEqual(['2026-09-21', '2026-09-28', '2026-10-05'])
  })
  it('anual usa el mes de inicio', () => {
    const rule = { frequency: 'yearly' as const, day: 15, startDate: '2026-03-15' }
    expect(occurrencesBetween(rule, '2026-04-01', '2028-12-31')).toEqual(['2027-03-15', '2028-03-15'])
    expect(occurrencesBetween(rule, '2026-01-01', '2026-12-31')).toEqual(['2026-03-15'])
  })
  it('rango vacío', () => {
    const rule = { frequency: 'monthly' as const, day: 10, startDate: '2026-01-01' }
    expect(occurrencesBetween(rule, '2026-09-11', '2026-10-09')).toEqual([])
  })
})

describe('nextOccurrence', () => {
  it('mensual', () => {
    const rule = { frequency: 'monthly' as const, day: 10, startDate: '2026-01-01' }
    expect(nextOccurrence(rule, '2026-09-10')).toBe('2026-10-10')
    expect(nextOccurrence(rule, '2026-09-09')).toBe('2026-09-10')
  })
  it('terminada', () => {
    const rule = { frequency: 'monthly' as const, day: 10, startDate: '2026-01-01', endDate: '2026-09-30' }
    expect(nextOccurrence(rule, '2026-09-10')).toBeNull()
  })
})
