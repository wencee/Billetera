import { Chips } from '@/components/form/Chips'
import type { Category } from '@/core/types'

interface Props {
  categories: readonly Category[] | undefined
  value: string
  onChange: (id: string) => void
}

export function CategoryPicker({ categories, value, onChange }: Props) {
  return (
    <Chips
      aria-label="Categoría"
      value={value || null}
      onChange={onChange}
      options={(categories ?? []).map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
    />
  )
}
