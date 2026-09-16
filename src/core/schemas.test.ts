import { describe, expect, it } from 'vitest'
import { cardInputSchema, fieldErrors, purchaseInputSchema, statementOverrideInputSchema } from './schemas'

const validCard = {
  name: 'Visa', bank: 'Galicia', network: 'visa', last4: '4321', color: '#1d4ed8',
  limit: 100000, closingDay: 28, dueDay: 10, currencies: ['ARS'],
}

describe('cardInputSchema', () => {
  it('acepta una tarjeta válida', () => {
    expect(cardInputSchema.safeParse(validCard).success).toBe(true)
  })
  it('rechaza últimos 4 dígitos inválidos y días fuera de rango', () => {
    const r = cardInputSchema.safeParse({ ...validCard, last4: '12a4', closingDay: 32 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const e = fieldErrors(r.error)
      expect(e.last4).toBe('Son los últimos 4 dígitos')
      expect(e.closingDay).toBeDefined()
    }
  })
  it('nunca acepta el número completo de la tarjeta', () => {
    expect(cardInputSchema.safeParse({ ...validCard, last4: '4111111111111111' }).success).toBe(false)
  })
})

const validPurchase = {
  cardId: 'c1', description: 'Heladera', categoryId: 'cat', date: '2026-09-15', currency: 'ARS',
  cashPrice: 89999900, installments: 12, financing: 'none',
}

describe('purchaseInputSchema', () => {
  it('acepta sin interés', () => {
    expect(purchaseInputSchema.safeParse(validPurchase).success).toBe(true)
  })
  it('con interés exige interestInput', () => {
    const r = purchaseInputSchema.safeParse({ ...validPurchase, financing: 'interest' })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error).interestInput).toBe('Cargá cómo se calcula el interés')
  })
  it('acepta las tres formas de interés', () => {
    for (const interestInput of [
      { mode: 'installment', value: 4500000 },
      { mode: 'total', value: 27000000 },
      { mode: 'tna', value: 0.75 },
    ]) {
      expect(purchaseInputSchema.safeParse({ ...validPurchase, financing: 'interest', interestInput }).success).toBe(true)
    }
  })
  it('rechaza montos no enteros o cero', () => {
    expect(purchaseInputSchema.safeParse({ ...validPurchase, cashPrice: 10.5 }).success).toBe(false)
    expect(purchaseInputSchema.safeParse({ ...validPurchase, cashPrice: 0 }).success).toBe(false)
  })
})

describe('statementOverrideInputSchema', () => {
  it('vencimiento posterior al cierre', () => {
    expect(statementOverrideInputSchema.safeParse({ closingDate: '2026-10-01', dueDate: '2026-10-14' }).success).toBe(true)
    expect(statementOverrideInputSchema.safeParse({ closingDate: '2026-10-14', dueDate: '2026-10-01' }).success).toBe(false)
    expect(statementOverrideInputSchema.safeParse({ dueDate: '2026-10-14' }).success).toBe(true)
  })
})
