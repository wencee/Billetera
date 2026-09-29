import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { toast } from '@/app/toast'
import { TextField } from '@/components/form/TextField'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { categoryInputSchema, fieldErrors } from '@/core/schemas'
import type { Category } from '@/core/types'
import { categoryUsage, createCategory, deleteCategory, fallbackCategoryId, updateCategory } from '@/db'
import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/lib/labels'

interface Props {
  open: boolean
  /** null = nueva. */
  category: Category | null
  kind: Category['kind']
  onClose: () => void
}

export function CategorySheet({ open, category, kind, onClose }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [color, setColor] = useState(CATEGORY_COLORS[0]!)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const usage = useLiveQuery(() => (category ? categoryUsage(category.id) : Promise.resolve(0)), [category?.id])
  const isFallback = category?.id === fallbackCategoryId(kind)

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setIcon(category?.icon ?? '📦')
    setColor(category?.color ?? CATEGORY_COLORS[0]!)
    setErrors({})
    setConfirmDelete(false)
  }, [open, category])

  const save = async () => {
    const parsed = categoryInputSchema.safeParse({ name, icon, color, kind })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (category) await updateCategory(category.id, { name: parsed.data.name, icon: parsed.data.icon, color: parsed.data.color })
    else await createCategory(parsed.data)
    onClose()
  }

  const remove = async () => {
    if (!category) return
    const { moved } = await deleteCategory(category.id)
    toast(moved > 0 ? `Categoría borrada: ${moved} movimientos pasaron a "Otros"` : 'Categoría borrada')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      footer={
        <Button className="w-full" onClick={() => void save()}>
          {category ? 'Guardar' : 'Agregar'}
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl" style={{ background: `${color}33` }} aria-hidden>
          {icon}
        </span>
        <label className="card flex min-h-12 flex-1 items-center px-4">
          <TextField align="left" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" aria-label="Nombre" />
        </label>
      </div>
      {errors.name && <p className="pt-1 text-footnote text-red">{errors.name}</p>}

      <h3 className="mt-5 mb-2 text-footnote uppercase text-label-2">Ícono</h3>
      <div className="grid grid-cols-8 gap-1">
        {CATEGORY_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={e}
            aria-pressed={icon === e}
            onClick={() => setIcon(e)}
            className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition-transform duration-100 active:scale-90 ${icon === e ? 'bg-tint/20 ring-2 ring-tint' : ''}`}
          >
            {e}
          </button>
        ))}
      </div>
      <label className="card mt-2 flex min-h-12 items-center gap-3 px-4">
        <span className="shrink-0 text-body">Otro emoji</span>
        <TextField value={CATEGORY_EMOJIS.includes(icon) ? '' : icon} onChange={(e) => e.target.value.trim() && setIcon([...e.target.value.trim()].slice(0, 2).join(''))} placeholder="Tocá 🌐 en el teclado" />
      </label>

      <h3 className="mt-5 mb-2 text-footnote uppercase text-label-2">Color</h3>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={`h-9 w-9 rounded-full transition-transform duration-100 active:scale-90 ${color === c ? 'ring-2 ring-tint ring-offset-2 ring-offset-surface' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>

      {category && !isFallback && (
        <div className="mt-8">
          {confirmDelete ? (
            <div className="card p-4">
              <p className="text-subhead">
                {usage ? `${usage} movimientos usan "${category.name}". Van a pasar a "Otros".` : `Se borra "${category.name}".`} Si tenía presupuesto, también se borra.
              </p>
              <div className="mt-3 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => void remove()}>
                  Borrar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
              Borrar categoría
            </Button>
          )}
        </div>
      )}
    </Sheet>
  )
}
