import { describe, expect, it } from 'vitest'
import { projectCommitments } from './projection'

const cards = [
  { id: 'a', closingDay: 28, dueDay: 10 },
  { id: 'b', closingDay: 15, dueDay: 28 },
]

describe('projectCommitments', () => {
  it('suma cuotas pendientes por período, tarjeta y moneda', () => {
    const rows = projectCommitments({
      cards,
      installments: [
        { cardId: 'a', period: '2026-09', amount: 100, currency: 'ARS' },
        { cardId: 'a', period: '2026-10', amount: 100, currency: 'ARS' },
        { cardId: 'a', period: '2026-10', amount: 50, currency: 'USD' },
        { cardId: 'b', period: '2026-09', amount: 70, currency: 'ARS' },
        { cardId: 'b', period: '2028-01', amount: 999, currency: 'ARS' }, // fuera de la ventana
      ],
      fromPeriod: '2026-09',
      today: '2026-09-15',
    })
    expect(rows).toHaveLength(12)
    expect(rows[0]?.period).toBe('2026-09')
    expect(rows[11]?.period).toBe('2027-08')
    expect(rows[0]?.total).toEqual({ ARS: 170, USD: 0 })
    expect(rows[0]?.byCard).toEqual({ a: { ARS: 100, USD: 0 }, b: { ARS: 70, USD: 0 } })
    expect(rows[1]?.total).toEqual({ ARS: 100, USD: 50 })
    expect(rows[2]?.total).toEqual({ ARS: 0, USD: 0 })
  })

  it('proyecta suscripciones con tarjeta que todavía no se generaron', () => {
    const rows = projectCommitments({
      cards,
      installments: [{ cardId: 'a', period: '2026-10', amount: 100, currency: 'ARS' }],
      recurring: [{
        cardId: 'a', amount: 999, currency: 'ARS', active: true,
        frequency: 'monthly', day: 10, startDate: '2026-01-01', lastGeneratedUntil: '2026-09-10',
      }],
      fromPeriod: '2026-09',
      today: '2026-09-15',
    })
    // Septiembre ya fue generado (está en lastGeneratedUntil): no se duplica
    expect(rows[0]?.total.ARS).toBe(0)
    // 10/10 entra en el resumen de octubre (cierra el 28)
    expect(rows[1]?.total.ARS).toBe(100 + 999)
    expect(rows[2]?.total.ARS).toBe(999)
    expect(rows[11]?.total.ARS).toBe(999)
  })

  it('suscripción en cuotas reparte hacia adelante y respeta la ventana', () => {
    const rows = projectCommitments({
      cards,
      installments: [],
      recurring: [{
        cardId: 'a', amount: 3000, currency: 'ARS', active: true, installments: 3,
        frequency: 'yearly', day: 1, startDate: '2026-11-01',
      }],
      fromPeriod: '2026-09',
      months: 4,
      today: '2026-09-15',
    })
    expect(rows.map((r) => r.total.ARS)).toEqual([0, 0, 1000, 1000])
  })

  it('ignora reglas inactivas y tarjetas desconocidas', () => {
    const rows = projectCommitments({
      cards,
      installments: [],
      recurring: [
        { cardId: 'a', amount: 999, currency: 'ARS', active: false, frequency: 'monthly', day: 10, startDate: '2026-01-01' },
        { cardId: 'zzz', amount: 999, currency: 'ARS', active: true, frequency: 'monthly', day: 10, startDate: '2026-01-01' },
      ],
      fromPeriod: '2026-09',
      months: 2,
      today: '2026-09-15',
    })
    expect(rows.every((r) => r.total.ARS === 0)).toBe(true)
  })
})
