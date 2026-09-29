import { describe, expect, it } from 'vitest'
import { activeFilterCount, buildMovements, filterMovements, groupByDay, movementTotals, normalizeText, type MovementSources, type NameLookup } from './movements'

const names: NameLookup = {
  category: (id) => ({ super: 'Supermercado', cafe: 'Café', casa: 'Casa' })[id],
  account: (id) => ({ mp: { name: 'Mercado Pago', currency: 'ARS' as const }, bank: { name: 'Galicia', currency: 'ARS' as const }, usd: { name: 'Dólares', currency: 'USD' as const } })[id],
  card: (id) => ({ visa: 'Visa •4321' })[id],
}

const src: MovementSources = {
  expenses: [
    { id: 'e1', amount: 150050, currency: 'ARS', categoryId: 'super', date: '2026-09-20', method: 'debit', accountId: 'bank', createdAt: '2026-09-20T10:00:00Z' },
    { id: 'e2', amount: 3500, currency: 'ARS', categoryId: 'cafe', date: '2026-09-21', method: 'wallet', accountId: 'mp', note: 'Cortado', createdAt: '2026-09-21T09:00:00Z' },
  ],
  incomes: [{ id: 'i1', amount: 2000000, currency: 'ARS', date: '2026-09-05', source: 'Sueldo', accountId: 'bank', createdAt: '2026-09-05T08:00:00Z' }],
  transfers: [{ id: 't1', fromAccountId: 'bank', fromAmount: 145000, toAccountId: 'usd', toAmount: 10000, date: '2026-09-21', createdAt: '2026-09-21T12:00:00Z' }],
  purchases: [{ id: 'p1', cardId: 'visa', description: 'Heladera', merchant: 'Frávega', categoryId: 'casa', date: '2026-09-10', currency: 'ARS', totalAmount: 90000000, installments: 12, createdAt: '2026-09-10T15:00:00Z' }],
  cardPayments: [{ id: 'c1', cardId: 'visa', amount: 7500000, accountId: 'bank', date: '2026-09-10', createdAt: '2026-09-10T16:00:00Z' }],
}

const list = buildMovements(src, names)

describe('buildMovements', () => {
  it('ordena por fecha descendente y después por hora de carga', () => {
    expect(list.map((m) => m.key)).toEqual(['transfer:t1', 'expense:e2', 'expense:e1', 'cardPayment:c1', 'card:p1', 'income:i1'])
  })
  it('arma títulos y detalles legibles', () => {
    const byKey = new Map(list.map((m) => [m.key, m]))
    expect(byKey.get('expense:e1')).toMatchObject({ title: 'Supermercado', detail: 'Galicia', direction: 'out' })
    expect(byKey.get('expense:e2')).toMatchObject({ title: 'Cortado', detail: 'Café · Mercado Pago' })
    expect(byKey.get('card:p1')).toMatchObject({ title: 'Heladera', detail: 'Frávega · Visa •4321 · 12 cuotas', method: 'card', installments: 12 })
    expect(byKey.get('transfer:t1')).toMatchObject({ detail: 'Galicia → Dólares', toAmount: 10000, toCurrency: 'USD', direction: 'neutral' })
    expect(byKey.get('cardPayment:c1')).toMatchObject({ title: 'Pago Visa •4321', method: 'card-payment' })
    expect(byKey.get('income:i1')).toMatchObject({ title: 'Sueldo', direction: 'in' })
  })
})

describe('filterMovements', () => {
  const cat = names.category
  it('busca sin tildes en título, detalle, nota y categoría', () => {
    expect(filterMovements(list, { query: 'cafe' }, cat).map((m) => m.id)).toEqual(['e2'])
    expect(filterMovements(list, { query: 'FRAVEGA' }, cat).map((m) => m.id)).toEqual(['p1'])
    expect(filterMovements(list, { query: 'super' }, cat).map((m) => m.id)).toEqual(['e1'])
  })
  it('busca por monto', () => {
    expect(filterMovements(list, { query: '1500' }, cat).map((m) => m.id)).toEqual(['e1'])
    expect(filterMovements(list, { query: '1.500,5' }, cat).map((m) => m.id)).toEqual(['e1'])
  })
  it('filtra por fecha, tipo, categoría, medio, tarjeta, cuenta y moneda', () => {
    expect(filterMovements(list, { from: '2026-09-20', to: '2026-09-20' }).map((m) => m.id)).toEqual(['e1'])
    expect(filterMovements(list, { kinds: ['income'] }).map((m) => m.id)).toEqual(['i1'])
    expect(filterMovements(list, { categoryIds: ['casa'] }).map((m) => m.id)).toEqual(['p1'])
    expect(filterMovements(list, { methods: ['wallet'] }).map((m) => m.id)).toEqual(['e2'])
    expect(filterMovements(list, { cardIds: ['visa'] }).map((m) => m.id)).toEqual(['cardPayment:c1', 'card:p1'].map((k) => k.split(':')[1]))
    expect(filterMovements(list, { accountIds: ['usd'] }).map((m) => m.id)).toEqual(['t1'])
    expect(filterMovements(list, { currencies: ['USD'] })).toEqual([])
  })
  it('cuenta filtros activos sin contar la búsqueda', () => {
    expect(activeFilterCount({ query: 'x' })).toBe(0)
    expect(activeFilterCount({ from: '2026-09-01', categoryIds: ['a'], methods: [] })).toBe(2)
  })
})

describe('agrupado y totales', () => {
  it('agrupa por día con el neto (las transferencias no cuentan)', () => {
    const groups = groupByDay(list)
    expect(groups.map((g) => g.date)).toEqual(['2026-09-21', '2026-09-20', '2026-09-10', '2026-09-05'])
    expect(groups[0]?.net).toEqual({ ARS: -3500, USD: 0 })
    expect(groups[3]?.net).toEqual({ ARS: 2000000, USD: 0 })
  })
  it('totales: los pagos de resumen no se cuentan como gasto', () => {
    expect(movementTotals(list)).toEqual({ income: { ARS: 2000000, USD: 0 }, spent: { ARS: 150050 + 3500 + 90000000, USD: 0 } })
  })
  it('normalizeText', () => {
    expect(normalizeText('Cañón Árbol')).toBe('cañon arbol'.normalize('NFD').replace(/\p{M}/gu, ''))
  })
})
