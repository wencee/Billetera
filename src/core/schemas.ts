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

/** Primer mensaje de error de un resultado Zod, por campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
