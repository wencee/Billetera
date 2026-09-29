import { z } from 'zod'

/** Esquemas Zod compartidos por formularios e importación de backups. */

// Mensajes por defecto en español para lo que no tenga un mensaje propio.
z.config(z.locales.es())

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
export const periodSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Período inválido')
export const currencySchema = z.enum(['ARS', 'USD'])
export const centsSchema = z.number().int('Tiene que ser un monto en centavos')
export const positiveCentsSchema = centsSchema.positive('El monto tiene que ser mayor a cero')

export const cardInputSchema = z.object({
  name: z.string().trim().min(1, 'Poné un nombre').max(40, 'Máximo 40 caracteres'),
  bank: z.string().trim().max(40).default(''),
  network: z.enum(['visa', 'mastercard', 'amex', 'other']),
  last4: z.string().regex(/^\d{4}$/, 'Son los últimos 4 dígitos'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  limit: centsSchema.nonnegative('El límite no puede ser negativo'),
  closingDay: z.number({ error: 'Poné el día de cierre' }).int().min(1, 'Un día entre 1 y 31').max(31, 'Un día entre 1 y 31'),
  dueDay: z.number({ error: 'Poné el día de vencimiento' }).int().min(1, 'Un día entre 1 y 31').max(31, 'Un día entre 1 y 31'),
  currencies: z.array(currencySchema).min(1, 'Elegí al menos una moneda'),
})
export type CardInput = z.infer<typeof cardInputSchema>

export const interestInputSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('installment'), value: positiveCentsSchema }),
  z.object({ mode: z.literal('total'), value: positiveCentsSchema }),
  z.object({ mode: z.literal('tna'), value: z.number().min(0, 'La TNA no puede ser negativa').max(20, 'TNA fuera de rango') }),
])

export const purchaseInputSchema = z
  .object({
    cardId: z.string().min(1, 'Elegí una tarjeta'),
    description: z.string().trim().min(1, 'Poné una descripción').max(80),
    merchant: z.string().trim().max(60).optional(),
    categoryId: z.string().min(1, 'Elegí una categoría'),
    date: isoDateSchema,
    currency: currencySchema,
    cashPrice: positiveCentsSchema,
    installments: z.number().int().min(1, 'Mínimo 1 cuota').max(120, 'Máximo 120 cuotas'),
    financing: z.enum(['none', 'interest']),
    interestInput: interestInputSchema.optional(),
    firstPeriod: periodSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((p) => p.financing === 'none' || p.interestInput !== undefined, {
    message: 'Cargá cómo se calcula el interés',
    path: ['interestInput'],
  })
export type PurchaseInput = z.infer<typeof purchaseInputSchema>

export const cardPaymentInputSchema = z.object({
  cardId: z.string().min(1),
  period: periodSchema,
  amount: centsSchema.nonnegative(),
  kind: z.enum(['total', 'partial', 'minimum']),
  accountId: z.string().min(1).optional(),
  date: isoDateSchema,
  note: z.string().trim().max(200).optional(),
})
export type CardPaymentInput = z.infer<typeof cardPaymentInputSchema>

export const statementOverrideInputSchema = z
  .object({
    closingDate: isoDateSchema.optional(),
    dueDate: isoDateSchema.optional(),
  })
  .refine((o) => !o.closingDate || !o.dueDate || o.dueDate > o.closingDate, {
    message: 'El vencimiento tiene que ser posterior al cierre',
    path: ['dueDate'],
  })

const nameSchema = (max: number) => z.string().trim().min(1, 'Poné un nombre').max(max, `Máximo ${max} caracteres`)
const noteSchema = z.string().trim().max(200, 'Máximo 200 caracteres').optional()

export const accountInputSchema = z.object({
  name: nameSchema(40),
  type: z.enum(['cash', 'bank', 'wallet']),
  currency: currencySchema,
  initialBalance: centsSchema,
})
export type AccountInput = z.infer<typeof accountInputSchema>

export const categoryInputSchema = z.object({
  name: nameSchema(30),
  icon: z.string().trim().min(1, 'Elegí un ícono').max(16),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  kind: z.enum(['expense', 'income']),
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

export const expenseInputSchema = z.object({
  amount: positiveCentsSchema,
  currency: currencySchema,
  categoryId: z.string().min(1, 'Elegí una categoría'),
  date: isoDateSchema,
  method: z.enum(['cash', 'debit', 'transfer', 'wallet']),
  accountId: z.string().min(1, 'Elegí una cuenta'),
  note: noteSchema,
})
export type ExpenseInput = z.infer<typeof expenseInputSchema>

export const incomeInputSchema = z.object({
  amount: positiveCentsSchema,
  currency: currencySchema,
  date: isoDateSchema,
  source: z.string().trim().min(1, 'Poné de dónde viene').max(40),
  accountId: z.string().min(1, 'Elegí una cuenta'),
  note: noteSchema,
})
export type IncomeInput = z.infer<typeof incomeInputSchema>

export const transferInputSchema = z
  .object({
    fromAccountId: z.string().min(1, 'Elegí la cuenta de origen'),
    fromAmount: positiveCentsSchema,
    toAccountId: z.string().min(1, 'Elegí la cuenta de destino'),
    toAmount: positiveCentsSchema,
    date: isoDateSchema,
    note: noteSchema,
  })
  .refine((t) => t.fromAccountId !== t.toAccountId, { message: 'Elegí dos cuentas distintas', path: ['toAccountId'] })
export type TransferInput = z.infer<typeof transferInputSchema>

export const recurringInputSchema = z
  .object({
    kind: z.enum(['expense', 'income']),
    name: nameSchema(40),
    amount: positiveCentsSchema,
    currency: currencySchema,
    categoryId: z.string().min(1).optional(),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    day: z.number().int(),
    method: z.enum(['cash', 'debit', 'transfer', 'wallet', 'card']),
    accountId: z.string().min(1).optional(),
    cardId: z.string().min(1).optional(),
    installments: z.number().int().min(1).max(120).optional(),
    active: z.boolean(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional(),
  })
  .refine((r) => (r.frequency === 'weekly' ? r.day >= 0 && r.day <= 6 : r.day >= 1 && r.day <= 31), {
    message: 'Día inválido',
    path: ['day'],
  })
  .refine((r) => r.kind === 'income' || r.categoryId !== undefined, { message: 'Elegí una categoría', path: ['categoryId'] })
  .refine((r) => (r.method === 'card' ? r.kind === 'expense' && r.cardId !== undefined : r.accountId !== undefined), {
    message: 'Elegí de dónde sale la plata',
    path: ['accountId'],
  })
  .refine((r) => !r.endDate || r.endDate >= r.startDate, { message: 'Termina antes de empezar', path: ['endDate'] })
export type RecurringInput = z.infer<typeof recurringInputSchema>

export const goalInputSchema = z.object({
  name: nameSchema(40),
  emoji: z.string().trim().min(1, 'Elegí un ícono').max(16),
  targetAmount: positiveCentsSchema,
  currency: currencySchema,
  targetDate: isoDateSchema.optional(),
})
export type GoalInput = z.infer<typeof goalInputSchema>

export const goalEntryInputSchema = z.object({
  goalId: z.string().min(1),
  /** Negativo = retiro. */
  amount: centsSchema.refine((v) => v !== 0, 'El monto tiene que ser distinto de cero'),
  date: isoDateSchema,
  accountId: z.string().min(1).optional(),
  note: noteSchema,
})
export type GoalEntryInput = z.infer<typeof goalEntryInputSchema>

export const investmentInputSchema = z
  .object({
    type: z.enum(['ars', 'usd', 'plazo_fijo', 'fci', 'crypto', 'other']),
    name: nameSchema(40),
    amount: positiveCentsSchema,
    currency: currencySchema,
    date: isoDateSchema,
    tna: z.number().min(0, 'La TNA no puede ser negativa').max(20, 'TNA fuera de rango').optional(),
    maturityDate: isoDateSchema.optional(),
    accountId: z.string().min(1).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((i) => i.type !== 'plazo_fijo' || i.tna !== undefined, { message: 'Cargá la TNA', path: ['tna'] })
  .refine((i) => i.type !== 'plazo_fijo' || i.maturityDate !== undefined, { message: 'Cargá el vencimiento', path: ['maturityDate'] })
  .refine((i) => !i.maturityDate || i.maturityDate > i.date, { message: 'El vencimiento tiene que ser posterior a la fecha', path: ['maturityDate'] })
export type InvestmentInput = z.infer<typeof investmentInputSchema>

export const closeInvestmentSchema = z.object({
  amount: centsSchema.nonnegative('El monto no puede ser negativo'),
  date: isoDateSchema,
  accountId: z.string().min(1).optional(),
})
export type CloseInvestmentInput = z.infer<typeof closeInvestmentSchema>

export const budgetInputSchema = z.object({
  categoryId: z.string().min(1),
  monthlyLimit: positiveCentsSchema,
})

/** Primer mensaje de error de un resultado Zod, por campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
