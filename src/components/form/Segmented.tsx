import { motion } from 'motion/react'
import { useId } from 'react'
import { springs } from '@/motion/springs'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  'aria-label'?: string
}

/** Control segmentado de iOS: el indicador se desliza con un resorte entre opciones. */
export function Segmented<T extends string>({ value, options, onChange, ...aria }: Props<T>) {
  const layoutId = useId()
  return (
    <div role="radiogroup" aria-label={aria['aria-label']} className="flex w-full rounded-lg bg-fill p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 rounded-[7px] px-2 py-1.5 text-subhead font-medium transition-colors duration-150 ${active ? 'text-label' : 'text-label-2'}`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[7px] bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                transition={springs.default}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
