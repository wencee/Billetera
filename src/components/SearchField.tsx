import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** Buscador estilo iOS: lupa, texto de 16px (sin zoom) y botón para borrar. */
export function SearchField({ value, onChange, placeholder = 'Buscar' }: Props) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl bg-fill-2 px-3 text-label-2">
      <Search size={18} aria-hidden />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-body text-label outline-none placeholder:text-label-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Borrar búsqueda" onClick={() => onChange('')} className="-mr-1 flex h-8 w-8 items-center justify-center active:opacity-60">
          <X size={16} className="rounded-full bg-label-3 p-0.5 text-surface" aria-hidden />
        </button>
      )}
    </label>
  )
}
