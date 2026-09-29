import type { Cents, Currency, ISODate } from './types'

export interface BalanceInput {
  accounts: readonly { id: string; initialBalance: Cents }[]
  expenses: readonly { accountId: string; amount: Cents; date: ISODate }[]
  incomes: readonly { accountId: string; amount: Cents; date: ISODate }[]
  transfers: readonly { fromAccountId: string; fromAmount: Cents; toAccountId: string; toAmount: Cents; date: ISODate }[]
  /** Pagos de resúmenes de tarjeta que salieron de una cuenta. */
  cardPayments: readonly { accountId?: string | undefined; amount: Cents; date: ISODate }[]
  /** Aportes a metas (positivo = sale plata de la cuenta, negativo = retiro que vuelve). */
  goalEntries?: readonly { accountId?: string | undefined; amount: Cents; date: ISODate }[]
  /** Solo cuenta movimientos con fecha hasta este día inclusive (los futuros no afectan el saldo actual). */
  asOf?: ISODate
}

/**
 * Saldo de cada cuenta = saldo inicial + ingresos − gastos ± transferencias
 * − pagos de tarjeta − aportes a metas. El saldo nunca se guarda: se calcula
 * siempre a partir de los movimientos, así no se desincroniza.
 */
export function accountBalances(input: BalanceInput): Map<string, Cents> {
  const { accounts, expenses, incomes, transfers, cardPayments, goalEntries = [], asOf } = input
  const balances = new Map<string, Cents>()
  for (const a of accounts) balances.set(a.id, a.initialBalance)
  const inRange = (date: ISODate) => asOf === undefined || date <= asOf
  const add = (id: string | undefined, amount: Cents) => {
    if (id === undefined || !balances.has(id)) return
    balances.set(id, (balances.get(id) ?? 0) + amount)
  }
  for (const e of expenses) if (inRange(e.date)) add(e.accountId, -e.amount)
  for (const i of incomes) if (inRange(i.date)) add(i.accountId, i.amount)
  for (const t of transfers) {
    if (!inRange(t.date)) continue
    add(t.fromAccountId, -t.fromAmount)
    add(t.toAccountId, t.toAmount)
  }
  for (const p of cardPayments) if (inRange(p.date)) add(p.accountId, -p.amount)
  for (const g of goalEntries) if (inRange(g.date)) add(g.accountId, -g.amount)
  return balances
}

/** Suma saldos por moneda. */
export function totalsByCurrency(
  accounts: readonly { id: string; currency: Currency }[],
  balances: ReadonlyMap<string, Cents>,
): Record<Currency, Cents> {
  const totals: Record<Currency, Cents> = { ARS: 0, USD: 0 }
  for (const a of accounts) totals[a.currency] += balances.get(a.id) ?? 0
  return totals
}
