import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useUIStore } from '@/app/store'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { FormGroup, FormRow } from '@/components/form/Form'
import { Toggle } from '@/components/form/Toggle'
import { NativeSelect, TextField } from '@/components/form/TextField'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { cardInputSchema, fieldErrors, type CardInput } from '@/core/schemas'
import type { CardNetwork, Currency } from '@/core/types'
import { createCard, deleteCard, updateCard } from '@/db'
import { CARD_COLORS, NETWORK_LABEL } from './labels'
import { useCard } from './hooks'

type Draft = { [K in keyof CardInput]: K extends 'limit' ? number | null : K extends 'closingDay' | 'dueDay' ? string : CardInput[K] }

const EMPTY: Draft = { name: '', bank: '', network: 'visa', last4: '', color: CARD_COLORS[0]!, limit: null, closingDay: '', dueDay: '', currencies: ['ARS'] }

/** Alta y edición de tarjeta. Nunca pide el número completo ni el CVV. */
export function CardForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = useCard(id)
  const setActiveCardId = useUIStore((s) => s.setActiveCardId)
  const editing = Boolean(id)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [archived, setArchived] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(!editing)

  useEffect(() => {
    if (existing && !loaded) {
      setDraft({ ...existing, closingDay: String(existing.closingDay), dueDay: String(existing.dueDay) })
      setArchived(existing.archived)
      setLoaded(true)
    }
  }, [existing, loaded])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const toggleCurrency = (c: Currency, on: boolean) =>
    set('currencies', on ? [...new Set([...draft.currencies, c])] : draft.currencies.filter((x) => x !== c))

  const save = async () => {
    const parsed = cardInputSchema.safeParse({
      ...draft,
      limit: draft.limit ?? 0,
      closingDay: Number(draft.closingDay),
      dueDay: Number(draft.dueDay),
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    if (editing && id) {
      await updateCard(id, { ...parsed.data, archived })
      navigate(-1)
    } else {
      const card = await createCard(parsed.data)
      setActiveCardId(card.id)
      navigate('/tarjetas', { replace: true })
    }
  }

  const remove = async () => {
    if (!id) return
    const result = await deleteCard(id)
    toast(result === 'deleted' ? 'Tarjeta eliminada' : 'La tarjeta tiene compras: quedó archivada')
    navigate('/tarjetas', { replace: true })
  }

  return (
    <Screen
      title={editing ? 'Editar tarjeta' : 'Nueva tarjeta'}
      back="Tarjetas" backTo="/tarjetas"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      <FormGroup title="Tarjeta" error={errors.name ?? errors.last4 ?? errors.bank}>
        <FormRow label="Nombre" error={errors.name}>
          <TextField value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Visa Galicia" autoFocus={!editing} />
        </FormRow>
        <FormRow label="Banco" error={errors.bank}>
          <TextField value={draft.bank} onChange={(e) => set('bank', e.target.value)} placeholder="Galicia" />
        </FormRow>
        <FormRow label="Red">
          <NativeSelect value={draft.network} onChange={(e) => set('network', e.target.value as CardNetwork)}>
            {(Object.keys(NETWORK_LABEL) as CardNetwork[]).map((n) => (
              <option key={n} value={n}>{NETWORK_LABEL[n]}</option>
            ))}
          </NativeSelect>
        </FormRow>
        <FormRow label="Últimos 4 dígitos" error={errors.last4}>
          <TextField value={draft.last4} inputMode="numeric" maxLength={4} pattern="[0-9]*" onChange={(e) => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4321" />
        </FormRow>
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]" role="radiogroup" aria-label="Color">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={draft.color === c}
              aria-label={c}
              onClick={() => set('color', c)}
              className={`h-9 w-9 shrink-0 rounded-full transition-transform duration-100 active:scale-90 ${draft.color === c ? 'ring-2 ring-tint ring-offset-2 ring-offset-surface' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </FormGroup>

      <FormGroup title="Límite y ciclo" error={errors.limit ?? errors.closingDay ?? errors.dueDay} footer="Si el banco corre un cierre por feriado, lo corregís después desde el resumen.">
        <FormRow label="Límite de compra" error={errors.limit}>
          <AmountInput value={draft.limit} onChange={(v) => set('limit', v)} />
        </FormRow>
        <FormRow label="Día de cierre" error={errors.closingDay}>
          <TextField value={draft.closingDay} inputMode="numeric" maxLength={2} onChange={(e) => set('closingDay', e.target.value.replace(/\D/g, ''))} placeholder="28" />
        </FormRow>
        <FormRow label="Día de vencimiento" error={errors.dueDay}>
          <TextField value={draft.dueDay} inputMode="numeric" maxLength={2} onChange={(e) => set('dueDay', e.target.value.replace(/\D/g, ''))} placeholder="10" />
        </FormRow>
      </FormGroup>

      <FormGroup title="Monedas" error={errors.currencies}>
        <FormRow label="Pesos (ARS)">
          <Toggle checked={draft.currencies.includes('ARS')} onChange={(on) => toggleCurrency('ARS', on)} aria-label="Pesos" />
        </FormRow>
        <FormRow label="Dólares (USD)">
          <Toggle checked={draft.currencies.includes('USD')} onChange={(on) => toggleCurrency('USD', on)} aria-label="Dólares" />
        </FormRow>
      </FormGroup>

      {editing && (
        <>
          <FormGroup footer="Una tarjeta archivada no aparece en el carrusel, pero conserva sus compras.">
            <FormRow label="Archivada">
              <Toggle checked={archived} onChange={setArchived} aria-label="Archivada" />
            </FormRow>
          </FormGroup>
          <div className="px-4 pt-6">
            <Button variant="destructive" className="w-full" onClick={() => void remove()}>
              Eliminar tarjeta
            </Button>
          </div>
        </>
      )}
      <div className="px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Agregar tarjeta'}
        </Button>
      </div>
    </Screen>
  )
}
