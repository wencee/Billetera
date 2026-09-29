import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { ListGroup, ListRow } from '@/components/List'
import { Screen } from '@/components/Screen'
import { Segmented } from '@/components/form/Segmented'
import type { Category } from '@/core/types'
import { moveCategory } from '@/db'
import { useCategories } from '@/db/hooks'
import { CategorySheet } from './CategorySheet'

type Kind = Category['kind']

export function CategoriesScreen() {
  const [kind, setKind] = useState<Kind>('expense')
  const categories = useCategories(kind)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  return (
    <Screen title="Categorías" back="Ajustes" backTo="/ajustes">
      <div className="px-4">
        <Segmented<Kind> aria-label="Tipo" value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Gastos' }, { value: 'income', label: 'Ingresos' }]} />
      </div>

      <ListGroup footer={kind === 'income' ? 'Aparecen como sugerencias de "De dónde viene" al cargar un ingreso.' : 'El orden es el de los chips al cargar un gasto: poné arriba las que más usás.'}>
        <ListRow icon={<Plus size={22} className="text-tint" />} label="Nueva categoría" chevron onPress={() => setEditing('new')} last={!categories?.length} />
        {categories?.map((c, i) => (
          <div key={c.id} className={`flex items-center ${i === categories.length - 1 ? '' : 'border-b border-separator/60'}`}>
            <button type="button" onClick={() => setEditing(c)} className="flex min-h-12 flex-1 items-center gap-3 px-4 py-2 text-left active:bg-fill-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: `${c.color}26` }} aria-hidden>
                {c.icon}
              </span>
              <span className="flex-1 text-body">{c.name}</span>
            </button>
            <div className="flex pr-2">
              <button type="button" aria-label={`Subir ${c.name}`} disabled={i === 0} onClick={() => void moveCategory(c.id, -1)} className="flex h-11 w-9 items-center justify-center text-label-2 active:text-tint disabled:opacity-25">
                <ChevronUp size={20} />
              </button>
              <button type="button" aria-label={`Bajar ${c.name}`} disabled={i === categories.length - 1} onClick={() => void moveCategory(c.id, 1)} className="flex h-11 w-9 items-center justify-center text-label-2 active:text-tint disabled:opacity-25">
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
        ))}
      </ListGroup>

      <CategorySheet open={editing !== null} category={editing === 'new' ? null : editing} kind={kind} onClose={() => setEditing(null)} />
    </Screen>
  )
}
