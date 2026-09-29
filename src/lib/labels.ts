import type { Movement } from '@/core/movements'
import type { AccountType, Frequency, PaymentMethod } from '@/core/types'

export type AnyMethod = Movement['method']

export const METHOD_LABEL: Record<AnyMethod, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  transfer: 'Transferencia',
  wallet: 'Billetera',
  card: 'Tarjeta',
  'transfer-internal': 'Entre cuentas',
  'card-payment': 'Pago de tarjeta',
}

/** Medios que se eligen al cargar un gasto sin tarjeta. */
export const ACCOUNT_METHODS: readonly Exclude<PaymentMethod, 'card'>[] = ['cash', 'debit', 'transfer', 'wallet']

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  wallet: 'Billetera virtual',
}

export const ACCOUNT_TYPE_ICON: Record<AccountType, string> = {
  cash: '💵',
  bank: '🏦',
  wallet: '📱',
}

/** Medio por defecto según la cuenta: efectivo → efectivo, banco → débito, billetera → billetera. */
export function defaultMethodFor(type: AccountType): Exclude<PaymentMethod, 'card'> {
  return type === 'cash' ? 'cash' : type === 'bank' ? 'debit' : 'wallet'
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const

/** Emojis sugeridos para categorías (además se puede tipear cualquiera). */
export const CATEGORY_EMOJIS = [
  '🛒', '🍔', '🍕', '☕', '🍺', '🚌', '🚕', '⛽', '🚗', '🏠', '💡', '🔥', '💧', '📶', '📱', '💊', '🏥', '🦷',
  '👕', '👟', '💄', '💇', '🎬', '🎮', '🎵', '📺', '📚', '🎓', '🎁', '🐶', '🐱', '✈️', '🏖️', '🏋️', '⚽', '💻',
  '🧾', '🏛️', '👶', '🧹', '🔧', '🌱', '💼', '🧑‍💻', '🏷️', '📈', '💰', '📦',
]

export const CATEGORY_COLORS = [
  '#34c759', '#30b0c7', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#ff3b30', '#ff9500', '#ffcc00', '#a2845e', '#8e8e93', '#636366',
]
