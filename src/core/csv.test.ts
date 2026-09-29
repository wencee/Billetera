import { describe, expect, it } from 'vitest'
import { csvDate, csvNumber, csvText, movementsToCsv } from './csv'
import type { Movement } from './movements'

describe('celdas CSV', () => {
  it('escapa separador, comillas y saltos de línea', () => {
    expect(csvText('hola')).toBe('hola')
    expect(csvText('a;b')).toBe('"a;b"')
    expect(csvText('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(csvText('dos\nlíneas')).toBe('"dos\nlíneas"')
  })
  it('neutraliza fórmulas (inyección CSV)', () => {
    expect(csvText('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`)
    expect(csvText('+54 11')).toBe("'+54 11")
    expect(csvText('@SUM(A1)')).toBe("'@SUM(A1)")
  })
  it('números con coma decimal y signo', () => {
    expect(csvNumber(123456)).toBe('1234,56')
    expect(csvNumber(-5)).toBe('-0,05')
    expect(csvNumber(100)).toBe('1,00')
  })
  it('fechas dd/mm/aaaa', () => {
    expect(csvDate('2026-09-05')).toBe('05/09/2026')
  })
})

describe('movementsToCsv', () => {
  const base = { createdAt: 'x', accountIds: [], currency: 'ARS' as const }
  const movements: Movement[] = [
    { ...base, key: 'expense:1', id: '1', kind: 'expense', date: '2026-09-10', title: 'Café; con leche', detail: 'Efectivo', amount: 350000, direction: 'out', method: 'cash', categoryId: 'cafe', note: 'con Juan' },
    { ...base, key: 'income:2', id: '2', kind: 'income', date: '2026-09-05', title: 'Sueldo', detail: 'Galicia', amount: 210000000, direction: 'in', method: 'transfer' },
    { ...base, key: 'card:3', id: '3', kind: 'card', date: '2026-09-01', title: 'Heladera', detail: 'Visa', amount: 89999900, direction: 'out', method: 'card', installments: 12 },
  ]
  it('encabezado, filas con signo y CRLF', () => {
    const csv = movementsToCsv(movements, (id) => (id === 'cafe' ? 'Comida afuera' : undefined))
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Fecha;Tipo;Descripción;Detalle;Categoría;Medio;Moneda;Monto;Cuotas;Nota')
    expect(lines[1]).toBe('10/09/2026;Gasto;"Café; con leche";Efectivo;Comida afuera;Efectivo;ARS;-3500,00;;con Juan')
    expect(lines[2]).toBe('05/09/2026;Ingreso;Sueldo;Galicia;;Transferencia;ARS;2100000,00;;')
    expect(lines[3]).toBe('01/09/2026;Compra con tarjeta;Heladera;Visa;;Tarjeta;ARS;-899999,00;12;')
    expect(csv.endsWith('\r\n')).toBe(true)
  })
})
