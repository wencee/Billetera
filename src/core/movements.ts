import type { Cents, Currency, ISODate, PaymentMethod } from './types'

/**
 * Lista unificada de movimientos: gastos, ingresos, transferencias, compras
 * con tarjeta y pagos de resúmenes. Es una vista: cada ítem apunta a su fila
 * de origen por `kind` + `id`.
 */
export type MovementKind = 'expense' | 'income' | 'transfer' | 'card' | 'cardPayment'

export interface Movement {
  key: string
  id: string
  kind: MovementKind
  date: ISODate
  createdAt: string
  title: string
  /** Texto secundario ya armado (cuenta, tarjeta, cuotas…). */
  detail: string
  /** Siempre positivo; el signo lo da `direction`. */
  amount: Cents
  currency: Currency
  /** Solo para transferencias entre monedas distintas. */
  toAmount?: Cents
  toCurrency?: Currency
  direction: 'out' | 'in' | 'neutral'
  categoryId?: string
  method: PaymentMethod | 'transfer-internal' | 'card-payment'
  accountIds: string[]
  cardId?: string
  note?: string
  installments?: number
}

export interface MovementSources {
  expenses: readonly { id: string; amount: Cents; currency: Currency; categoryId: string; date: ISODate; method: PaymentMethod; accountId: string; note?: string | undefined; createdAt: string }[]
  incomes: readonly { id: string; amount: Cents; currency: Currency; date: ISODate; source: string; accountId: string; note?: string | undefined; createdAt: string }[]
  transfers: readonly { id: string; fromAccountId: string; fromAmount: Cents; toAccountId: string; toAmount: Cents; date: ISODate; note?: string | undefined; createdAt: string }[]
  purchases: readonly { id: string; cardId: string; description: string; merchant?: string | undefined; categoryId: string; date: ISODate; currency: Currency; totalAmount: Cents; installments: number; notes?: string | undefined; createdAt: string }[]
  cardPayments: readonly { id: string; cardId: string; amount: Cents; accountId?: string | undefined; date: ISODate; createdAt: string }[]
}

export interface NameLookup {
  category: (id: string) => string | undefined
  account: (id: string) => { name: string; currency: Currency } | undefined
  card: (id: string) => string | undefined
}

export function buildMovements(src: MovementSources, names: NameLookup): Movement[] {
  const out: Movement[] = []
  const accountName = (id: string) => names.account(id)?.name ?? 'Cuenta borrada'

  for (const e of src.expenses) {
    const category = names.category(e.categoryId) ?? 'Gasto'
    out.push({
      key: `expense:${e.id}`, id: e.id, kind: 'expense', date: e.date, createdAt: e.createdAt,
      title: e.note?.trim() || category, detail: e.note?.trim() ? `${category} · ${accountName(e.accountId)}` : accountName(e.accountId),
      amount: e.amount, currency: e.currency, direction: 'out', categoryId: e.categoryId, method: e.method,
      accountIds: [e.accountId], ...(e.note ? { note: e.note } : {}),
    })
  }
  for (const i of src.incomes) {
    out.push({
      key: `income:${i.id}`, id: i.id, kind: 'income', date: i.date, createdAt: i.createdAt,
      title: i.source || 'Ingreso', detail: accountName(i.accountId), amount: i.amount, currency: i.currency,
      direction: 'in', method: 'transfer', accountIds: [i.accountId], ...(i.note ? { note: i.note } : {}),
    })
  }
  for (const t of src.transfers) {
    const from = names.account(t.fromAccountId)
    const to = names.account(t.toAccountId)
    const crossCurrency = from && to && from.currency !== to.currency
    out.push({
      key: `transfer:${t.id}`, id: t.id, kind: 'transfer', date: t.date, createdAt: t.createdAt,
      title: t.note?.trim() || 'Transferencia', detail: `${accountName(t.fromAccountId)} → ${accountName(t.toAccountId)}`,
      amount: t.fromAmount, currency: from?.currency ?? 'ARS', direction: 'neutral', method: 'transfer-internal',
      accountIds: [t.fromAccountId, t.toAccountId],
      ...(crossCurrency ? { toAmount: t.toAmount, toCurrency: to.currency } : {}),
      ...(t.note ? { note: t.note } : {}),
    })
  }
  for (const p of src.purchases) {
    const card = names.card(p.cardId) ?? 'Tarjeta'
    const parts = [p.merchant, card, p.installments > 1 ? `${p.installments} cuotas` : null].filter(Boolean)
    out.push({
      key: `card:${p.id}`, id: p.id, kind: 'card', date: p.date, createdAt: p.createdAt,
      title: p.description, detail: parts.join(' · '), amount: p.totalAmount, currency: p.currency, direction: 'out',
      categoryId: p.categoryId, method: 'card', accountIds: [], cardId: p.cardId, installments: p.installments,
      ...(p.notes ? { note: p.notes } : {}),
    })
  }
  for (const c of src.cardPayments) {
    const card = names.card(c.cardId) ?? 'tarjeta'
    out.push({
      key: `cardPayment:${c.id}`, id: c.id, kind: 'cardPayment', date: c.date, createdAt: c.createdAt,
      title: `Pago ${card}`, detail: c.accountId ? accountName(c.accountId) : 'Resumen de tarjeta', amount: c.amount,
      currency: 'ARS', direction: 'out', method: 'card-payment', accountIds: c.accountId ? [c.accountId] : [], cardId: c.cardId,
    })
  }
  return out.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.createdAt.localeCompare(a.createdAt)))
}

// ---------- Filtros ----------

export interface MovementFilter {
  query?: string
  from?: ISODate
  to?: ISODate
  kinds?: readonly MovementKind[]
  categoryIds?: readonly string[]
  methods?: readonly Movement['method'][]
  cardIds?: readonly string[]
  accountIds?: readonly string[]
  currencies?: readonly Currency[]
}

/** Minúsculas y sin tildes, para buscar "cafe" y encontrar "Café". */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function matchesQuery(m: Movement, query: string, categoryName: (id: string) => string | undefined): boolean {
  const q = normalizeText(query.trim())
  if (!q) return true
  const haystack = [m.title, m.detail, m.note ?? '', m.categoryId ? (categoryName(m.categoryId) ?? '') : '']
  if (haystack.some((h) => normalizeText(h).includes(q))) return true
  // "1500" o "1.500" o "1500,50" encuentran el monto $ 1.500,50
  const digits = q.replace(/[.\s$]/g, '').replace(',', '.')
  if (/^\d+(\.\d+)?$/.test(digits)) {
    const value = String(m.amount / 100)
    return value.startsWith(digits)
  }
  return false
}

export function filterMovements(list: readonly Movement[], f: MovementFilter, categoryName: (id: string) => string | undefined = () => undefined): Movement[] {
  return list.filter((m) => {
    if (f.from && m.date < f.from) return false
    if (f.to && m.date > f.to) return false
    if (f.kinds?.length && !f.kinds.includes(m.kind)) return false
    if (f.categoryIds?.length && !(m.categoryId && f.categoryIds.includes(m.categoryId))) return false
    if (f.methods?.length && !f.methods.includes(m.method)) return false
    if (f.cardIds?.length && !(m.cardId && f.cardIds.includes(m.cardId))) return false
    if (f.accountIds?.length && !m.accountIds.some((id) => f.accountIds!.includes(id))) return false
    if (f.currencies?.length && !f.currencies.includes(m.currency)) return false
    if (f.query && !matchesQuery(m, f.query, categoryName)) return false
    return true
  })
}

/** Cuántos filtros (fuera de la búsqueda) están activos, para el badge del botón. */
export function activeFilterCount(f: MovementFilter): number {
  let n = 0
  if (f.from || f.to) n++
  for (const list of [f.categoryIds, f.methods, f.cardIds, f.accountIds, f.currencies]) if (list?.length) n++
  return n
}

// ---------- Agrupado y totales ----------

export interface DayGroup {
  date: ISODate
  items: Movement[]
  /** Neto del día por moneda (ingresos − egresos; transferencias no cuentan). */
  net: Record<Currency, Cents>
}

export function groupByDay(list: readonly Movement[]): DayGroup[] {
  const groups: DayGroup[] = []
  let current: DayGroup | undefined
  for (const m of list) {
    if (!current || current.date !== m.date) {
      current = { date: m.date, items: [], net: { ARS: 0, USD: 0 } }
      groups.push(current)
    }
    current.items.push(m)
    current.net[m.currency] += signedAmount(m)
  }
  return groups
}

export function signedAmount(m: Movement): Cents {
  return m.direction === 'in' ? m.amount : m.direction === 'out' ? m.amount * -1 : 0
}

export interface MovementTotals {
  income: Record<Currency, Cents>
  /** Gastos y compras con tarjeta. Los pagos de resumen no suman para no contar dos veces. */
  spent: Record<Currency, Cents>
}

export function movementTotals(list: readonly Movement[]): MovementTotals {
  const totals: MovementTotals = { income: { ARS: 0, USD: 0 }, spent: { ARS: 0, USD: 0 } }
  for (const m of list) {
    if (m.kind === 'income') totals.income[m.currency] += m.amount
    else if (m.kind === 'expense' || m.kind === 'card') totals.spent[m.currency] += m.amount
  }
  return totals
}
