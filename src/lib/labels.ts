import type { Movement } from '@/core/movements'
import type { AccountType, Frequency, InvestmentType, PaymentMethod } from '@/core/types'

export type AnyMethod = Movement['method']

export const METHOD_LABEL: Record<AnyMethod, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  transfer: 'Transferencia',
  wallet: 'Billetera',
  card: 'Tarjeta',
  'transfer-internal': 'Entre cuentas',
  'card-payment': 'Pago de tarjeta',
  saving: 'Ahorro e inversión',
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

export const INVESTMENT_TYPE_LABEL: Record<InvestmentType, string> = {
  plazo_fijo: 'Plazo fijo',
  fci: 'FCI',
  usd: 'Dólares',
  ars: 'Pesos',
  crypto: 'Cripto',
  other: 'Otro',
}

export const INVESTMENT_TYPE_ICON: Record<InvestmentType, string> = {
  plazo_fijo: '🏦',
  fci: '📊',
  usd: '💵',
  ars: '💰',
  crypto: '🪙',
  other: '📈',
}

export const INVESTMENT_NAME_HINT: Record<InvestmentType, string> = {
  plazo_fijo: 'Plazo fijo Galicia',
  fci: 'FCI Money Market',
  usd: 'Dólares ahorrados',
  ars: 'Cuenta remunerada',
  crypto: 'USDT',
  other: 'Acciones',
}

/** Emojis sugeridos para metas. */
export const GOAL_EMOJIS = [
  '🏖️', '✈️', '🏔️', '🚗', '🏍️', '🏠', '🛋️', '💍', '🎓', '👶', '🐶', '💻', '📱', '🎮', '📷', '🎸',
  '🚲', '⛺', '🎁', '🩺', '🆘', '💰', '🐷', '⭐',
]
