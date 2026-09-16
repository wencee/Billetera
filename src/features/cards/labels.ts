import type { StatementStatus } from '@/core/statements'
import type { CardNetwork, CardPaymentKind } from '@/core/types'

export const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'AMEX',
  other: 'Tarjeta',
}

export const STATUS_LABEL: Record<StatementStatus, string> = {
  unpaid: 'Impago',
  minimum: 'Pago mínimo',
  partial: 'Pago parcial',
  paid: 'Pagado',
}

export const STATUS_TONE: Record<StatementStatus, string> = {
  unpaid: 'bg-red/15 text-red',
  minimum: 'bg-orange/15 text-orange',
  partial: 'bg-orange/15 text-orange',
  paid: 'bg-green/15 text-green',
}

export const PAYMENT_KIND_LABEL: Record<CardPaymentKind, string> = {
  total: 'Pago total',
  partial: 'Pago parcial',
  minimum: 'Pago mínimo',
}

export const CARD_COLORS = ['#1d4ed8', '#0f766e', '#b91c1c', '#7c3aed', '#c2410c', '#0369a1', '#4d7c0f', '#1f2937', '#be185d', '#a16207']
