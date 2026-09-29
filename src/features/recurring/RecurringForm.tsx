import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { CategoryPicker } from '@/components/CategoryPicker'
import { AmountInput } from '@/components/form/AmountInput'
import { Chips } from '@/components/form/Chips'
import { FormGroup, FormRow } from '@/components/form/Form'
import { AccountPicker } from '@/components/form/Pickers'
import { Segmented } from '@/components/form/Segmented'
import { DateField, TextField } from '@/components/form/TextField'
import { Toggle } from '@/components/form/Toggle'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { addDays, dateParts, todayISO } from '@/core/dates'
import { formatDate } from '@/core/format'
import { nextOccurrence } from '@/core/recurring'
import { fieldErrors, recurringInputSchema } from '@/core/schemas'
import type { Currency, Frequency, PaymentMethod } from '@/core/types'
import { createRecurring, db, deleteRecurring, restoreRecurring, updateRecurring } from '@/db'
import { useAccounts, useAllCards, useCategories } from '@/db/hooks'
import { defaultMethodFor, WEEKDAYS } from '@/lib/labels'

type Kind = 'expense' | 'income'
type Source = 'account' | 'card'
type AccountMethod = Exclude<PaymentMethod, 'card'>

export function RecurringForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = useLiveQuery(() => (id ? db.recurring.get(id) : undefined), [id])
  const accounts = useAccounts()
  const cards = useAllCards()
  const categories = useCategories('expense')
  const [loaded, setLoaded] = useState(!editing)

  const [kind, setKind] = useState<Kind>('expense')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [day, setDay] = useState(String(dateParts(todayISO()).day))
  const [weekday, setWeekday] = useState(1)
  const [source, setSource] = useState<Source>('account')
  const [accountId, setAccountId] = useState('')
  const [method, setMethod] = useState<AccountMethod>('debit')
  const [cardId, setCardId] = useState('')
  const [installments, setInstallments] = useState(1)
  const [startDate, setStartDate] = useState(todayISO())
  const [hasEnd, setHasEnd] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!existing || loaded) return
    setKind(existing.kind)
    setName(existing.name)
    setAmount(existing.amount)
    setCurrency(existing.currency)
    setCategoryId(existing.categoryId ?? '')
    setFrequency(existing.frequency)
    if (existing.frequency === 'weekly') setWeekday(existing.day)
    else setDay(String(existing.day))
    setSource(existing.method === 'card' ? 'card' : 'account')
    setAccountId(existing.accountId ?? '')
    if (existing.method !== 'card') setMethod(existing.method)
    setCardId(existing.cardId ?? '')
    setInstallments(existing.installments ?? 1)
    setStartDate(existing.startDate)
    setHasEnd(Boolean(existing.endDate))
    setEndDate(existing.endDate ?? '')
    setActive(existing.active)
    setLoaded(true)
  }, [existing, loaded])

  useEffect(() => {
    if (!accountId && accounts?.length) setAccountId((accounts.find((a) => a.type === 'bank') ?? accounts[0])!.id)
    if (!cardId && cards?.length) setCardId(cards.find((c) => !c.archived)?.id ?? '')
  }, [accounts, cards, accountId, cardId])

  const payWithCard = kind === 'expense' && source === 'card'
  const input = {
    kind, name, amount: amount ?? 0, currency, categoryId: kind === 'expense' && categoryId ? categoryId : undefined, frequency,
    day: frequency === 'weekly' ? weekday : Number(day), method: payWithCard ? 'card' : kind === 'income' ? 'transfer' : method,
    accountId: payWithCard ? undefined : accountId || undefined, cardId: payWithCard ? cardId || undefined : undefined,
    installments: payWithCard ? installments : undefined, active, startDate, endDate: hasEnd && endDate ? endDate : undefined,
  }
  const preview = recurringInputSchema.safeParse(input)
  const next = preview.success && active ? nextOccurrence(preview.data, addDays(todayISO(), -1)) : null

  const save = async () => {
    if (!preview.success) {
      setErrors(fieldErrors(preview.error))
      return
    }
    if (editing && id) await updateRecurring(id, preview.data)
    else await createRecurring(preview.data)
    navigate(-1)
  }

  const remove = async () => {
    if (!id) return
    const row = await deleteRecurring(id)
    navigate(-1)
    if (row) toast('Gasto fijo borrado (lo ya cargado queda)', { actionLabel: 'Deshacer', onAction: () => restoreRecurring(row) })
  }

  const account = accounts?.find((a) => a.id === accountId)
  const card = cards?.find((c) => c.id === cardId)
  const currencies: Currency[] = payWithCard ? (card?.currencies ?? ['ARS']) : account ? [account.currency] : ['ARS']

  const currenciesKey = currencies.join(',')
  const ready = Boolean(accounts && cards && loaded)
  useEffect(() => {
    if (!ready) return
    const list = currenciesKey.split(',') as Currency[]
    if (!list.includes(currency)) setCurrency(list[0] ?? 'ARS')
  }, [currenciesKey, currency, ready])

  return (
    <Screen
      title={editing ? 'Editar fijo' : 'Nuevo fijo'}
      back="Fijos"
      backTo="/ajustes/fijos"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      <div className="px-4 pt-4">
        <Segmented<Kind> aria-label="Tipo" value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Gasto o suscripción' }, { value: 'income', label: 'Ingreso' }]} />
      </div>

      <FormGroup error={errors.name ?? errors.amount}>
        <FormRow label="Nombre" error={errors.name}>
          <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'income' ? 'Sueldo' : 'Netflix'} autoFocus={!editing} />
        </FormRow>
        <FormRow label="Monto" error={errors.amount}>
          <AmountInput value={amount} onChange={setAmount} currency={currency} />
        </FormRow>
        {currencies.length > 1 && (
          <div className="px-4 py-3">
            <Segmented<Currency> aria-label="Moneda" value={currency} onChange={setCurrency} options={[{ value: 'ARS', label: 'Pesos' }, { value: 'USD', label: 'Dólares' }]} />
          </div>
        )}
      </FormGroup>

      {kind === 'expense' && (
        <FormGroup title="Categoría" error={errors.categoryId}>
          <div className="py-2">
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          </div>
        </FormGroup>
      )}

      <FormGroup title="Cuándo" error={errors.day} footer={frequency === 'yearly' ? `Todos los años en el mes de la fecha de inicio.` : undefined}>
        <div className="px-4 py-3">
          <Segmented<Frequency> aria-label="Frecuencia" value={frequency} onChange={setFrequency} options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }, { value: 'yearly', label: 'Anual' }]} />
        </div>
        {frequency === 'weekly' ? (
          <div className="py-2">
            <Chips aria-label="Día de la semana" value={weekday} onChange={setWeekday} options={WEEKDAYS.map((w, i) => ({ value: i, label: w.slice(0, 3) }))} />
          </div>
        ) : (
          <FormRow label="Día del mes" error={errors.day}>
            <TextField value={day} inputMode="numeric" maxLength={2} onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))} placeholder="10" />
          </FormRow>
        )}
      </FormGroup>

      <FormGroup title={kind === 'income' ? 'A qué cuenta entra' : 'Cómo se paga'} error={errors.accountId}>
        {kind === 'expense' && (cards?.length ?? 0) > 0 && (
          <div className="px-4 py-3">
            <Segmented<Source> aria-label="Medio" value={source} onChange={setSource} options={[{ value: 'account', label: 'Desde una cuenta' }, { value: 'card', label: 'Con tarjeta' }]} />
          </div>
        )}
        {payWithCard ? (
          <>
            <div className="py-2">
              <Chips aria-label="Tarjeta" value={cardId} onChange={setCardId} options={(cards ?? []).filter((c) => !c.archived).map((c) => ({ value: c.id, label: `${c.name} •${c.last4}` }))} />
            </div>
            <div className="py-2">
              <p className="px-4 pb-1 text-footnote uppercase text-label-2">Cuotas</p>
              <Chips aria-label="Cuotas" value={installments} onChange={setInstallments} options={[1, 3, 6, 12].map((n) => ({ value: n, label: n === 1 ? '1 pago' : String(n) }))} />
            </div>
          </>
        ) : (
          <>
            <div className="py-2">
              <AccountPicker
                accounts={accounts}
                value={accountId}
                onChange={(v) => {
                  setAccountId(v)
                  const a = accounts?.find((x) => x.id === v)
                  if (a) setMethod(defaultMethodFor(a.type))
                }}
              />
            </div>
            {kind === 'expense' && (
              <div className="px-4 py-3">
                <Segmented<AccountMethod> aria-label="Medio de pago" value={method} onChange={setMethod} options={[{ value: 'cash', label: 'Efectivo' }, { value: 'debit', label: 'Débito' }, { value: 'transfer', label: 'Transf.' }, { value: 'wallet', label: 'Billetera' }]} />
              </div>
            )}
          </>
        )}
      </FormGroup>

      <FormGroup
        title="Vigencia"
        error={errors.endDate ?? errors.startDate}
        footer={startDate < todayISO() && !editing ? 'La fecha de inicio es anterior a hoy: se van a cargar también los que ya pasaron.' : next ? `Próximo: ${formatDate(next)}` : undefined}
      >
        <FormRow label="Desde">
          <DateField value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
        </FormRow>
        <FormRow label="Tiene fecha de fin">
          <Toggle checked={hasEnd} onChange={setHasEnd} aria-label="Tiene fecha de fin" />
        </FormRow>
        {hasEnd && (
          <FormRow label="Hasta" error={errors.endDate}>
            <DateField value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormRow>
        )}
        {editing && (
          <FormRow label="Activo">
            <Toggle checked={active} onChange={setActive} aria-label="Activo" />
          </FormRow>
        )}
      </FormGroup>

      <div className="flex flex-col gap-3 px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Agregar'}
        </Button>
        {editing && (
          <Button variant="destructive" className="w-full" onClick={() => void remove()}>
            Borrar
          </Button>
        )}
      </div>
    </Screen>
  )
}
