import { useEffect, useRef, type ReactNode } from 'react'

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
  const ref = useRef<HTMLDivElement>(null)

  // Si el elegido quedó fuera de la vista (al editar, o un chip cortado en el borde), la fila se corre para mostrarlo.
  useEffect(() => {
    const el = ref.current
    if (!el || layout !== 'scroll') return
    const active = el.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!active) return
    const c = el.getBoundingClientRect()
    const a = active.getBoundingClientRect()
    if (a.left >= c.left && a.right <= c.right) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: el.scrollLeft + (a.left - c.left) - (c.width - a.width) / 2, behavior: reduced ? 'auto' : 'smooth' })
  }, [value, options.length, layout])

  return (
    <div
      ref={ref}
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
