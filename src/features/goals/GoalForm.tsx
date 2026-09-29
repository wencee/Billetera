import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { FormGroup, FormRow } from '@/components/form/Form'
import { Segmented } from '@/components/form/Segmented'
import { DateField, TextField } from '@/components/form/TextField'
import { Toggle } from '@/components/form/Toggle'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { addMonths, todayISO } from '@/core/dates'
import { fieldErrors, goalInputSchema } from '@/core/schemas'
import type { Currency } from '@/core/types'
import { createGoal, db, deleteGoal, restoreGoal, updateGoal } from '@/db'
import { GOAL_EMOJIS } from '@/lib/labels'

export function GoalForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = useLiveQuery(() => (id ? db.goals.get(id) : undefined), [id])
  const hasEntries = useLiveQuery(async () => (id ? (await db.goalEntries.where('goalId').equals(id).count()) > 0 : false), [id])
  const [loaded, setLoaded] = useState(!editing)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(GOAL_EMOJIS[0]!)
  const [targetAmount, setTargetAmount] = useState<number | null>(null)
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [hasDate, setHasDate] = useState(true)
  const [targetDate, setTargetDate] = useState(addMonths(todayISO(), 6))
  const [archived, setArchived] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!existing || loaded) return
    setName(existing.name)
    setEmoji(existing.emoji)
    setTargetAmount(existing.targetAmount)
    setCurrency(existing.currency)
    setHasDate(Boolean(existing.targetDate))
    if (existing.targetDate) setTargetDate(existing.targetDate)
    setArchived(existing.archived)
    setLoaded(true)
  }, [existing, loaded])

  const save = async () => {
    const parsed = goalInputSchema.safeParse({ name, emoji, targetAmount: targetAmount ?? 0, currency, targetDate: hasDate ? targetDate : undefined })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (editing && id) {
      await updateGoal(id, { ...parsed.data, archived })
      navigate(-1)
    } else {
      const goal = await createGoal(parsed.data)
      navigate(`/metas/${goal.id}`, { replace: true })
    }
  }

  const remove = async () => {
    if (!id) return
    const snapshot = await deleteGoal(id)
    navigate('/metas', { replace: true })
    if (snapshot) toast('Meta borrada', { actionLabel: 'Deshacer', onAction: () => restoreGoal(snapshot) })
  }

  return (
    <Screen
      title={editing ? 'Editar meta' : 'Nueva meta'}
      back="Metas"
      backTo="/metas"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      <div className="flex flex-col items-center px-4 pt-6">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-pink/15 text-5xl" aria-hidden>{emoji}</span>
      </div>
      <div className="grid grid-cols-8 gap-1 px-4 pt-4" role="radiogroup" aria-label="Ícono">
        {GOAL_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={emoji === e}
            aria-label={e}
            onClick={() => setEmoji(e)}
            className={`flex aspect-square items-center justify-center rounded-xl text-2xl transition-transform duration-100 active:scale-90 ${emoji === e ? 'bg-tint/20 ring-2 ring-tint' : ''}`}
          >
            {e}
          </button>
        ))}
      </div>

      <FormGroup title="Meta" error={errors.name ?? errors.targetAmount}>
        <FormRow label="Nombre" error={errors.name}>
          <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Viaje a Brasil" autoFocus={!editing} />
        </FormRow>
        <FormRow label="Quiero juntar" error={errors.targetAmount}>
          <AmountInput value={targetAmount} onChange={setTargetAmount} currency={currency} aria-label="Monto objetivo" />
        </FormRow>
        <div className={`px-4 py-3 ${editing && hasEntries ? 'pointer-events-none opacity-50' : ''}`}>
          <Segmented<Currency> aria-label="Moneda" value={currency} onChange={setCurrency} options={[{ value: 'ARS', label: 'Pesos' }, { value: 'USD', label: 'Dólares' }]} />
        </div>
      </FormGroup>

      <FormGroup title="Fecha objetivo" error={errors.targetDate} footer="Con fecha te digo cuánto aportar por mes para llegar a tiempo.">
        <FormRow label="Tiene fecha">
          <Toggle checked={hasDate} onChange={setHasDate} aria-label="Tiene fecha objetivo" />
        </FormRow>
        {hasDate && (
          <FormRow label="Para el">
            <DateField value={targetDate} min={todayISO()} onChange={(e) => e.target.value && setTargetDate(e.target.value)} />
          </FormRow>
        )}
      </FormGroup>

      {editing && (
        <FormGroup footer="Una meta archivada deja de aparecer arriba, pero conserva su historial y lo ahorrado.">
          <FormRow label="Archivada">
            <Toggle checked={archived} onChange={setArchived} aria-label="Archivada" />
          </FormRow>
        </FormGroup>
      )}

      <div className="flex flex-col gap-3 px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Crear meta'}
        </Button>
        {editing && (
          <Button variant="destructive" className="w-full" onClick={() => void remove()}>
            Borrar meta
          </Button>
        )}
      </div>
    </Screen>
  )
}
