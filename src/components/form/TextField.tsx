import type { InputHTMLAttributes } from 'react'

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

export function DateField(props: Omit<Props, 'type'>) {
  return <TextField type="date" className="appearance-none" {...props} />
}

export function NativeSelect({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`min-w-0 appearance-none bg-transparent text-right text-body text-tint outline-none ${className}`} {...rest}>
      {children}
    </select>
  )
}
