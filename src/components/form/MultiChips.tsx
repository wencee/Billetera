import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props<T extends string> {
  values: readonly T[]
  options: readonly { value: T; label: ReactNode }[]
  onChange: (values: T[]) => void
  'aria-label'?: string
}

/** Chips de selección múltiple que envuelven en varias líneas. */
export function MultiChips<T extends string>({ values, options, onChange, ...aria }: Props<T>) {
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  return (
    <div role="group" aria-label={aria['aria-label']} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(o.value)}
            className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-subhead font-medium transition-[background-color,transform] duration-100 active:scale-95 ${
              active ? 'bg-tint text-white' : 'bg-fill text-label'
            }`}
          >
            {active && <Check size={14} strokeWidth={3} aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
