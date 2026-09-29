import { dateParts } from './dates'
import type { Movement } from './movements'
import type { Cents } from './types'

/**
 * CSV pensado para Excel / Numbers / Google Sheets en español: separador ";",
 * coma decimal, fechas dd/mm/aaaa. El BOM (lo agrega quien arma el archivo)
 * hace que Excel lea bien las tildes.
 */
export const CSV_SEPARATOR = ';'
export const CSV_BOM = String.fromCharCode(0xfeff)

/**
 * Escapa una celda de texto. Si empieza con = + - @ (o tab/CR), se antepone un
 * apóstrofo para que la planilla no la interprete como fórmula (inyección CSV).
 */
export function csvText(value: string, sep = CSV_SEPARATOR): string {
  let v = value
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  if (v.includes(sep) || v.includes('"') || v.includes('\n') || v.includes('\r')) v = `"${v.replace(/"/g, '""')}"`
  return v
}

/** Número con coma decimal y sin separador de miles: -1234,56 */
export function csvNumber(cents: Cents): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

export function csvDate(iso: string): string {
  const { year, month, day } = dateParts(iso)
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

const KIND_LABEL: Record<Movement['kind'], string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  card: 'Compra con tarjeta',
  cardPayment: 'Pago de tarjeta',
  saving: 'Ahorro o inversión',
}

const METHOD_LABEL: Record<Movement['method'], string> = {
  cash: 'Efectivo', debit: 'Débito', transfer: 'Transferencia', wallet: 'Billetera', card: 'Tarjeta',
  'transfer-internal': 'Entre cuentas', 'card-payment': 'Pago de tarjeta', saving: 'Ahorro',
}

export const MOVEMENTS_CSV_HEADER = ['Fecha', 'Tipo', 'Descripción', 'Detalle', 'Categoría', 'Medio', 'Moneda', 'Monto', 'Cuotas', 'Nota']

/**
 * Movimientos a CSV. El monto lleva signo: negativo si sale plata, positivo si
 * entra; transferencias y ahorros van en positivo (mueven, no gastan).
 */
export function movementsToCsv(movements: readonly Movement[], categoryName: (id: string) => string | undefined = () => undefined): string {
  const lines = [MOVEMENTS_CSV_HEADER.map((h) => csvText(h)).join(CSV_SEPARATOR)]
  for (const m of movements) {
    const amount = m.direction === 'out' ? -m.amount : m.amount
    lines.push(
      [
        csvDate(m.date),
        csvText(KIND_LABEL[m.kind]),
        csvText(m.title),
        csvText(m.detail),
        csvText(m.categoryId ? (categoryName(m.categoryId) ?? '') : ''),
        csvText(METHOD_LABEL[m.method]),
        m.currency,
        csvNumber(amount),
        m.installments && m.installments > 1 ? String(m.installments) : '',
        csvText(m.note ?? ''),
      ].join(CSV_SEPARATOR),
    )
  }
  return lines.join('\r\n') + '\r\n'
}
