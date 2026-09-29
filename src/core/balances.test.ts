import { describe, expect, it } from 'vitest'
import { accountBalances, totalsByCurrency } from './balances'

const accounts = [
  { id: 'cash', initialBalance: 10000, currency: 'ARS' as const },
  { id: 'bank', initialBalance: 500000, currency: 'ARS' as const },
  { id: 'usd', initialBalance: 10000, currency: 'USD' as const },
]

describe('accountBalances', () => {
  it('saldo inicial + ingresos − gastos ± transferencias − pagos de tarjeta − aportes', () => {
    const b = accountBalances({
      accounts,
      expenses: [{ accountId: 'cash', amount: 3000, date: '2026-09-10' }],
      incomes: [{ accountId: 'bank', amount: 100000, date: '2026-09-05' }],
      transfers: [
        { fromAccountId: 'bank', fromAmount: 20000, toAccountId: 'cash', toAmount: 20000, date: '2026-09-06' },
        // compra de dólares: $ 145.000 → US$ 100
        { fromAccountId: 'bank', fromAmount: 145000, toAccountId: 'usd', toAmount: 10000, date: '2026-09-07' },
      ],
      cardPayments: [{ accountId: 'bank', amount: 50000, date: '2026-09-10' }, { amount: 999, date: '2026-09-10' }],
      goalEntries: [{ accountId: 'bank', amount: 30000, date: '2026-09-11' }, { accountId: 'bank', amount: -5000, date: '2026-09-12' }],
    })
    expect(b.get('cash')).toBe(10000 - 3000 + 20000)
    expect(b.get('bank')).toBe(500000 + 100000 - 20000 - 145000 - 50000 - 30000 + 5000)
    expect(b.get('usd')).toBe(20000)
  })

  it('asOf ignora movimientos futuros', () => {
    const b = accountBalances({
      accounts,
      expenses: [{ accountId: 'cash', amount: 3000, date: '2026-10-01' }],
      incomes: [],
      transfers: [],
      cardPayments: [],
      asOf: '2026-09-30',
    })
    expect(b.get('cash')).toBe(10000)
  })

  it('movimientos de cuentas inexistentes no rompen nada', () => {
    const b = accountBalances({ accounts, expenses: [{ accountId: 'x', amount: 1, date: '2026-09-01' }], incomes: [], transfers: [], cardPayments: [] })
    expect(b.has('x')).toBe(false)
  })

  it('totales por moneda', () => {
    const b = new Map([['cash', 100], ['bank', 200], ['usd', 5]])
    expect(totalsByCurrency(accounts, b)).toEqual({ ARS: 300, USD: 5 })
  })
})
