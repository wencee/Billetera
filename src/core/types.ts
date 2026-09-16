/**
 * Tipos del dominio. Sin dependencias de React ni de la base de datos.
 *
 * Convenciones:
 * - Montos en centavos enteros (`Cents`). $ 1.234,56 → 123456.
 * - Fechas sin hora como 'YYYY-MM-DD' (`ISODate`), siempre en hora local.
 * - Un período de resumen es 'YYYY-MM' (`Period`): el mes en que *nominalmente* cierra.
 */

export type Cents = number
export type Currency = 'ARS' | 'USD'
export type ISODate = string
export type Period = string

export const CURRENCIES: readonly Currency[] = ['ARS', 'USD']

// ---------- Tarjetas ----------

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'other'

export interface Card {
  id: string
  name: string
  bank: string
  network: CardNetwork
  last4: string
  color: string
  /** Límite de compra en ARS. */
  limit: Cents
  /** Día del mes en que cierra el resumen (1-31; se recorta en meses cortos). */
  closingDay: number
  /** Día del mes en que vence el resumen (1-31). */
  dueDay: number
  currencies: Currency[]
  archived: boolean
  createdAt: string
}

/** Corrección manual de las fechas reales de un resumen (los bancos corren cierres por feriados). */
export interface StatementOverride {
  id: string
  cardId: string
  period: Period
  closingDate?: ISODate
  dueDate?: ISODate
}

export type Financing = 'none' | 'interest'
export type InterestMode = 'installment' | 'total' | 'tna'

/**
 * Cómo se cargó el interés:
 * - installment: `value` es el monto de cada cuota (Cents)
 * - total: `value` es el total financiado (Cents)
 * - tna: `value` es la TNA como fracción (0.6 = 60 %)
 */
export interface InterestInput {
  mode: InterestMode
  value: number
}

export interface Purchase {
  id: string
  cardId: string
  description: string
  merchant?: string
  categoryId: string
  date: ISODate
  currency: Currency
  cashPrice: Cents
  installments: number
  financing: Financing
  interestInput?: InterestInput
  /** Calculados al guardar. */
  installmentAmount: Cents
  totalAmount: Cents
  /** Período de la cuota 1. Editable a mano. */
  firstPeriod: Period
  notes?: string
  /** Si la generó un gasto fijo/suscripción. */
  recurringId?: string
  createdAt: string
}

export type InstallmentStatus = 'pending' | 'paid'

export interface Installment {
  id: string
  purchaseId: string
  cardId: string
  number: number
  count: number
  amount: Cents
  currency: Currency
  period: Period
  dueDate: ISODate
  status: InstallmentStatus
  paidAt?: ISODate
}

/**
 * Pago de un resumen. 'total' marca todas las cuotas del período como pagadas
 * sin importar el monto (el banco convierte el USD a su propia cotización).
 */
export type CardPaymentKind = 'total' | 'partial' | 'minimum'

export interface CardPayment {
  id: string
  cardId: string
  period: Period
  amount: Cents
  kind: CardPaymentKind
  /** Cuenta de la que salió la plata (opcional hasta que existan cuentas). */
  accountId?: string
  date: ISODate
  note?: string
  createdAt: string
}

// ---------- Cuentas y movimientos ----------

export type AccountType = 'cash' | 'bank' | 'wallet'

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: Currency
  initialBalance: Cents
  color?: string
  archived: boolean
  createdAt: string
}

export type PaymentMethod = 'cash' | 'debit' | 'transfer' | 'wallet' | 'card'

export interface Expense {
  id: string
  amount: Cents
  currency: Currency
  categoryId: string
  date: ISODate
  method: Exclude<PaymentMethod, 'card'>
  accountId: string
  note?: string
  recurringId?: string
  createdAt: string
}

export interface Income {
  id: string
  amount: Cents
  currency: Currency
  date: ISODate
  source: string
  accountId: string
  note?: string
  recurringId?: string
  createdAt: string
}

export interface Transfer {
  id: string
  fromAccountId: string
  fromAmount: Cents
  toAccountId: string
  toAmount: Cents
  date: ISODate
  note?: string
  createdAt: string
}

export type Frequency = 'weekly' | 'monthly' | 'yearly'

export interface Recurring {
  id: string
  kind: 'expense' | 'income'
  name: string
  amount: Cents
  currency: Currency
  categoryId?: string
  frequency: Frequency
  /** Mensual/anual: día del mes. Semanal: día de la semana (0 = domingo). */
  day: number
  method: PaymentMethod
  accountId?: string
  cardId?: string
  /** Si va a tarjeta, en cuántas cuotas (default 1). */
  installments?: number
  active: boolean
  startDate: ISODate
  endDate?: ISODate
  /** Hasta qué fecha (inclusive) ya se generaron los movimientos. */
  lastGeneratedUntil?: ISODate
  createdAt: string
}

// ---------- Metas, ahorros, presupuestos ----------

export interface Goal {
  id: string
  name: string
  emoji: string
  targetAmount: Cents
  currency: Currency
  targetDate?: ISODate
  archived: boolean
  createdAt: string
}

export interface GoalEntry {
  id: string
  goalId: string
  /** Negativo = retiro. */
  amount: Cents
  date: ISODate
  accountId?: string
  note?: string
  createdAt: string
}

export type InvestmentType = 'ars' | 'usd' | 'plazo_fijo' | 'fci' | 'crypto' | 'other'

export interface Investment {
  id: string
  type: InvestmentType
  name: string
  amount: Cents
  currency: Currency
  date: ISODate
  /** TNA como fracción, para plazo fijo. */
  tna?: number
  maturityDate?: ISODate
  currentValue?: Cents
  currentValueDate?: ISODate
  accountId?: string
  closed: boolean
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  /** Límite mensual en ARS. */
  monthlyLimit: Cents
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  kind: 'expense' | 'income'
  order: number
  isDefault: boolean
}

export interface Settings {
  id: 'main'
  /** Centavos de ARS por 1 USD. 0 = no cargada. */
  usdRate: Cents
  usdRateDate?: ISODate
  alertDaysAhead: number
  pinHash?: string
  pinSalt?: string
  privateMode: boolean
  lastBackupAt?: string
  sampleDataLoaded: boolean
}
