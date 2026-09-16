import { useEffect, useState } from 'react'
import { formatNumber, CURRENCY_SYMBOL } from '@/core/format'
import { parseAmount } from '@/core/money'
import type { Cents, Currency } from '@/core/types'

interface Props {
  value: Cents | null
  onChange: (cents: Cents | null) => void
  currency?: Currency
  /** "hero": monto grande centrado (carga rápida). "row": dentro de una fila de formulario. */
  size?: 'hero' | 'row'
  autoFocus?: boolean
  placeholder?: string
  id?: string
  'aria-label'?: string
}

function toText(cents: Cents | null): string {
  if (cents === null) return ''
  return formatNumber(cents / 100).replace(/ /g, '')
}

/**
 * Entrada de dinero con teclado numérico del iPhone (inputmode="decimal").
 * Acepta coma o punto decimal y separadores de miles; guarda centavos enteros.
 * Mientras se edita muestra lo que se tipea; al salir, lo formatea en es-AR.
 */
export function AmountInput({ value, onChange, currency = 'ARS', size = 'row', autoFocus, placeholder = '0', id, ...aria }: Props) {
  const [text, setText] = useState(() => toText(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(toText(value))
  }, [value, focused])

  const hero = size === 'hero'
  return (
    <span className={`flex items-baseline ${hero ? 'justify-center gap-2' : 'justify-end gap-1'} min-w-0`}>
      <span className={`${hero ? 'text-title2 text-label-2' : 'text-body text-label-2'}`}>{CURRENCY_SYMBOL[currency]}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        aria-label={aria['aria-label'] ?? 'Monto'}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          setText(toText(value))
        }}
        onChange={(e) => {
          const raw = e.target.value
          setText(raw)
          onChange(raw.trim() === '' ? null : parseAmount(raw))
        }}
        className={`tabular min-w-0 bg-transparent outline-none placeholder:text-label-3 ${
          hero ? 'w-full text-center text-[2.6rem] font-bold leading-none tracking-tight' : 'w-full text-right text-body'
        }`}
      />
    </span>
  )
}
