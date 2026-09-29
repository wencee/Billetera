import { describe, expect, it } from 'vitest'
import { cardInputSchema, fieldErrors, purchaseInputSchema, recurringInputSchema, statementOverrideInputSchema, transferInputSchema } from './schemas'

describe('transferInputSchema', () => {
  const t = { fromAccountId: 'a', fromAmount: 100, toAccountId: 'b', toAmount: 100, date: '2026-09-28' }
  it('exige cuentas distintas', () => {
    expect(transferInputSchema.safeParse(t).success).toBe(true)
    const r = transferInputSchema.safeParse({ ...t, toAccountId: 'a' })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error).toAccountId).toBe('Elegí dos cuentas distintas')
  })
})

describe('recurringInputSchema', () => {
  const base = { kind: 'expense', name: 'Netflix', amount: 999900, currency: 'ARS', categoryId: 'subs', frequency: 'monthly', day: 10, method: 'card', cardId: 'visa', active: true, startDate: '2026-09-28' }
  it('con tarjeta exige tarjeta; si no, cuenta', () => {
    expect(recurringInputSchema.safeParse(base).success).toBe(true)
    expect(recurringInputSchema.safeParse({ ...base, cardId: undefined }).success).toBe(false)
    expect(recurringInputSchema.safeParse({ ...base, method: 'debit', cardId: undefined }).success).toBe(false)
    expect(recurringInputSchema.safeParse({ ...base, method: 'debit', cardId: undefined, accountId: 'bank' }).success).toBe(true)
  })
  it('día según frecuencia', () => {
    expect(recurringInputSchema.safeParse({ ...base, day: 32 }).success).toBe(false)
    expect(recurringInputSchema.safeParse({ ...base, frequency: 'weekly', day: 6 }).success).toBe(true)
    expect(recurringInputSchema.safeParse({ ...base, frequency: 'weekly', day: 7 }).success).toBe(false)
  })
  it('un ingreso no puede ir a tarjeta y no necesita categoría', () => {
    expect(recurringInputSchema.safeParse({ ...base, kind: 'income', categoryId: undefined }).success).toBe(false)
    expect(recurringInputSchema.safeParse({ ...base, kind: 'income', categoryId: undefined, method: 'transfer', cardId: undefined, accountId: 'bank' }).success).toBe(true)
  })
})

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
