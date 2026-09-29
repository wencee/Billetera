import type { InputHTMLAttributes } from 'react'
import { isISODate } from '@/core/dates'
import { formatDate } from '@/core/format'

type Props = InputHTMLAttributes<HTMLInputElement> & { align?: 'left' | 'right' }

/** Input de texto plano para usar dentro de FormRow. Mínimo 16px para que Safari no haga zoom. */
export function TextField({ align = 'right', className = '', ...rest }: Props) {
  return (
    <input
      className={`w-full min-w-0 bg-transparent text-body outline-none placeholder:text-label-3 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      autoComplete="off"
      autoCorrect="off"
      {...rest}
    />
  )
}

/**
 * Fecha siempre en dd/mm/aaaa, sin depender de cómo cada navegador muestra el
 * input nativo. El input de fecha real queda encima, invisible: al tocarlo
 * iOS abre su selector de siempre.
 */
export function DateField({ value, className = '', align = 'right', placeholder = 'Elegir fecha', ...rest }: Omit<Props, 'type'>) {
  const text = typeof value === 'string' && isISODate(value) ? formatDate(value) : ''
  return (
    <span className={`relative inline-flex min-h-11 min-w-[7rem] items-center ${align === 'right' ? 'justify-end' : 'justify-start'} ${className}`}>
      <span className={`tabular pointer-events-none text-body ${text ? '' : 'text-label-3'}`} aria-hidden>
        {text || placeholder}
      </span>
      <input type="date" value={value} {...rest} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </span>
  )
}

export function NativeSelect({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`min-w-0 appearance-none bg-transparent text-right text-body text-tint outline-none ${className}`} {...rest}>
      {children}
    </select>
  )
}
