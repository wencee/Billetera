import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CategoryPicker } from '@/components/CategoryPicker'
import { AmountInput } from '@/components/form/AmountInput'
import { Chips } from '@/components/form/Chips'
import { FormGroup, FormRow } from '@/components/form/Form'
import { Segmented } from '@/components/form/Segmented'
import { DateField, TextField } from '@/components/form/TextField'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { addPeriods, periodParts, todayISO } from '@/core/dates'
import { formatPeriod } from '@/core/format'
import { analyzeFinancing, type FinancingAnalysis } from '@/core/interest'
import { INSTALLMENT_PRESETS } from '@/core/purchases'
import { fieldErrors, purchaseInputSchema, type PurchaseInput } from '@/core/schemas'
import { firstPeriodFor } from '@/core/statements'
import type { Currency, InterestInput, InterestMode } from '@/core/types'
import { createPurchase, updatePurchase } from '@/db'
import { FinancingSummary } from './FinancingSummary'
import { useCard, useCardOverrides, useCards, useCategories, usePurchase, useSettings } from './hooks'

interface Draft {
  cardId: string
  description: string
  merchant: string
  categoryId: string
  date: string
  currency: Currency
  cashPrice: number | null
  installments: number
  customInstallments: string
  financing: 'none' | 'interest'
  interestMode: InterestMode
  interestInstallment: number | null
  interestTotal: number | null
  interestTna: string
  /** Corrimiento respecto del resumen sugerido para la cuota 1. */
  periodShift: number
  notes: string
}

const PRESET_SET = new Set<number>(INSTALLMENT_PRESETS)
type InstallmentChoice = number | 'custom'

function emptyDraft(cardId: string): Draft {
  return {
    cardId, description: '', merchant: '', categoryId: '', date: todayISO(), currency: 'ARS', cashPrice: null,
    installments: 1, customInstallments: '', financing: 'none', interestMode: 'installment',
    interestInstallment: null, interestTotal: null, interestTna: '', periodShift: 0, notes: '',
  }
}

function interestInputOf(d: Draft): InterestInput | undefined {
  if (d.financing !== 'interest') return undefined
  switch (d.interestMode) {
    case 'installment': return d.interestInstallment ? { mode: 'installment', value: d.interestInstallment } : undefined
    case 'total': return d.interestTotal ? { mode: 'total', value: d.interestTotal } : undefined
    case 'tna': {
      const pct = Number(d.interestTna.replace(',', '.'))
      return d.interestTna.trim() !== '' && Number.isFinite(pct) ? { mode: 'tna', value: pct / 100 } : undefined
    }
  }
}

function monthsBetween(from: string, to: string): number {
  const a = periodParts(from)
  const b = periodParts(to)
  return b.year * 12 + b.month - (a.year * 12 + a.month)
}

/** Alta y edición de compra con tarjeta. La comparación contado vs. financiado se actualiza mientras escribís. */
export function PurchaseForm() {
  const { cardId: routeCardId, id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = usePurchase(id)
  const cards = useCards()
  const categories = useCategories('expense')
  const settings = useSettings()
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(routeCardId ?? ''))
  const [loaded, setLoaded] = useState(!editing)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const card = useCard(draft.cardId || undefined)
  const overrides = useCardOverrides(draft.cardId || undefined)

  const suggested = useMemo(() => (card ? firstPeriodFor(card, draft.date, overrides) : null), [card, draft.date, overrides])

  useEffect(() => {
    if (loaded || !existing) return
    if (!card) {
      setDraft((d) => (d.cardId === existing.cardId ? d : { ...d, cardId: existing.cardId }))
      return
    }
    if (!suggested) return
    const ii = existing.interestInput
    setDraft({
      cardId: existing.cardId, description: existing.description, merchant: existing.merchant ?? '', categoryId: existing.categoryId,
      date: existing.date, currency: existing.currency, cashPrice: existing.cashPrice, installments: existing.installments,
      customInstallments: PRESET_SET.has(existing.installments) ? '' : String(existing.installments),
      financing: existing.financing, interestMode: ii?.mode ?? 'installment',
      interestInstallment: ii?.mode === 'installment' ? ii.value : null, interestTotal: ii?.mode === 'total' ? ii.value : null,
      interestTna: ii?.mode === 'tna' ? String(Math.round(ii.value * 10000) / 100) : '',
      periodShift: monthsBetween(suggested, existing.firstPeriod), notes: existing.notes ?? '',
    })
    setLoaded(true)
  }, [existing, card, suggested, loaded])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const analysis: FinancingAnalysis | null = useMemo(() => {
    if (!draft.cashPrice || draft.cashPrice <= 0 || draft.installments < 1) return null
    try {
      const interestInput = interestInputOf(draft)
      return analyzeFinancing({ cashPrice: draft.cashPrice, count: draft.installments, financing: draft.financing, ...(interestInput ? { interestInput } : {}) })
    } catch {
      return null
    }
  }, [draft])

  const save = async () => {
    const interestInput = interestInputOf(draft)
    const parsed = purchaseInputSchema.safeParse({
      cardId: draft.cardId, description: draft.description, merchant: draft.merchant || undefined, categoryId: draft.categoryId,
      date: draft.date, currency: draft.currency, cashPrice: draft.cashPrice ?? 0, installments: draft.installments,
      financing: draft.financing, interestInput, firstPeriod: suggested ? addPeriods(suggested, draft.periodShift) : undefined,
      notes: draft.notes || undefined,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    const data: PurchaseInput = parsed.data
    if (editing && id) {
      await updatePurchase(id, data)
      navigate(-1)
    } else {
      const purchase = await createPurchase(data)
      navigate(`/compras/${purchase.id}`, { replace: true })
    }
  }

  const bothCurrencies = (card?.currencies.length ?? 1) > 1
  const installmentChoice: InstallmentChoice = PRESET_SET.has(draft.installments) && !draft.customInstallments ? draft.installments : 'custom'
  const installmentOptions: { value: InstallmentChoice; label: string }[] = [
    ...INSTALLMENT_PRESETS.map((n) => ({ value: n as InstallmentChoice, label: String(n) })),
    { value: 'custom', label: 'Otra' },
  ]
  const periodOptions = suggested
    ? [
        { value: '-1', label: `Anterior · ${formatPeriod(addPeriods(suggested, -1))}` },
        { value: '0', label: `Sugerido · ${formatPeriod(suggested)}` },
        { value: '1', label: `Siguiente · ${formatPeriod(addPeriods(suggested, 1))}` },
      ]
    : []

  return (
    <Screen
      title={editing ? 'Editar compra' : 'Nueva compra'}
      back={editing ? 'Compra' : 'Tarjetas'} backTo="/tarjetas"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      {cards && cards.length > 1 && (
        <div className="pt-4">
          <Chips aria-label="Tarjeta" value={draft.cardId} onChange={(v) => set('cardId', v)} options={cards.map((c) => ({ value: c.id, label: `${c.name} •${c.last4}` }))} />
        </div>
      )}

      <FormGroup title="Compra" error={errors.description ?? errors.categoryId ?? errors.date ?? errors.cardId}>
        <FormRow label="Descripción" error={errors.description}>
          <TextField value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Heladera" autoFocus={!editing} />
        </FormRow>
        <FormRow label="Comercio">
          <TextField value={draft.merchant} onChange={(e) => set('merchant', e.target.value)} placeholder="Frávega" />
        </FormRow>
        <FormRow label="Fecha" error={errors.date}>
          <DateField value={draft.date} onChange={(e) => set('date', e.target.value)} />
        </FormRow>
        <div className="py-2">
          <p className="px-4 pb-1 text-footnote uppercase text-label-2">Categoría</p>
          <CategoryPicker categories={categories} value={draft.categoryId} onChange={(v) => set('categoryId', v)} />
        </div>
      </FormGroup>

      <FormGroup title="Precio y cuotas" error={errors.cashPrice ?? errors.installments}>
        {bothCurrencies && (
          <div className="px-4 py-3">
            <Segmented aria-label="Moneda" value={draft.currency} onChange={(v) => set('currency', v)} options={[{ value: 'ARS', label: 'Pesos' }, { value: 'USD', label: 'Dólares' }]} />
          </div>
        )}
        <FormRow label="Precio de contado" error={errors.cashPrice}>
          <AmountInput value={draft.cashPrice} onChange={(v) => set('cashPrice', v)} currency={draft.currency} />
        </FormRow>
        <div className="py-2">
          <p className="px-4 pb-1 text-footnote uppercase text-label-2">Cuotas</p>
          <Chips
            aria-label="Cuotas"
            value={installmentChoice}
            onChange={(v) => {
              if (v === 'custom') set('customInstallments', draft.customInstallments || String(draft.installments))
              else setDraft((d) => ({ ...d, installments: v, customInstallments: '' }))
            }}
            options={installmentOptions}
          />
          {installmentChoice === 'custom' && (
            <FormRow label="Cantidad de cuotas" error={errors.installments}>
              <TextField
                value={draft.customInstallments}
                inputMode="numeric"
                maxLength={3}
                placeholder="15"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '')
                  setDraft((d) => ({ ...d, customInstallments: v, installments: Number(v) || d.installments }))
                }}
              />
            </FormRow>
          )}
        </div>
      </FormGroup>

      <FormGroup title="Financiación" error={errors.interestInput ?? errors['interestInput.value']}>
        <div className="px-4 py-3">
          <Segmented aria-label="Financiación" value={draft.financing} onChange={(v) => set('financing', v)} options={[{ value: 'none', label: 'Sin interés' }, { value: 'interest', label: 'Con interés' }]} />
        </div>
        {draft.financing === 'interest' && (
          <>
            <div className="px-4 pb-3">
              <Segmented aria-label="Cómo cargar el interés" value={draft.interestMode} onChange={(v) => set('interestMode', v)} options={[{ value: 'installment', label: 'Valor de cuota' }, { value: 'total', label: 'Total' }, { value: 'tna', label: 'TNA' }]} />
            </div>
            {draft.interestMode === 'installment' && (
              <FormRow label="Cada cuota">
                <AmountInput value={draft.interestInstallment} onChange={(v) => set('interestInstallment', v)} currency={draft.currency} />
              </FormRow>
            )}
            {draft.interestMode === 'total' && (
              <FormRow label="Total financiado">
                <AmountInput value={draft.interestTotal} onChange={(v) => set('interestTotal', v)} currency={draft.currency} />
              </FormRow>
            )}
            {draft.interestMode === 'tna' && (
              <FormRow label="TNA (%)">
                <TextField value={draft.interestTna} inputMode="decimal" placeholder="75" onChange={(e) => set('interestTna', e.target.value)} />
              </FormRow>
            )}
          </>
        )}
      </FormGroup>

      {analysis && draft.cashPrice && (
        <div className="px-4 pt-5">
          <FinancingSummary analysis={analysis} cashPrice={draft.cashPrice} currency={draft.currency} count={draft.installments} privateMode={settings?.privateMode ?? false} />
        </div>
      )}

      {suggested && (
        <FormGroup title="Resumen de la primera cuota" footer="Según la fecha de compra y el cierre de la tarjeta. Cambialo si el banco la asignó distinto.">
          <div className="px-4 py-3">
            <Segmented aria-label="Resumen de la cuota 1" value={String(Math.max(-1, Math.min(1, draft.periodShift)))} onChange={(v) => set('periodShift', Number(v))} options={periodOptions} />
          </div>
        </FormGroup>
      )}

      <FormGroup title="Notas">
        <textarea
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="Garantía, número de pedido…"
          className="w-full resize-none bg-transparent px-4 py-3 text-body outline-none placeholder:text-label-3"
        />
      </FormGroup>

      <div className="px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Agregar compra'}
        </Button>
      </div>
    </Screen>
  )
}
