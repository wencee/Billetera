import type { ReactNode } from 'react'

interface Chip<T extends string | number> {
  value: T
  label: ReactNode
}

interface Props<T extends string | number> {
  value: T | null
  options: readonly Chip<T>[]
  onChange: (value: T) => void
  /** Fila con scroll horizontal (default) o grilla que envuelve. */
  layout?: 'scroll' | 'wrap'
  'aria-label'?: string
}

/** Chips de selección única con respuesta al toque. */
export function Chips<T extends string | number>({ value, options, onChange, layout = 'scroll', ...aria }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      className={layout === 'scroll' ? 'flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]' : 'flex flex-wrap gap-2'}
      style={layout === 'scroll' ? { overscrollBehaviorX: 'contain' } : undefined}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-subhead font-medium transition-[background-color,transform] duration-100 active:scale-95 ${
              active ? 'bg-tint text-white' : 'bg-fill text-label'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
