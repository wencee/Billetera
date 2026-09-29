import { ArrowDownLeft, Plus, Repeat } from 'lucide-react'
import { useNavigate } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { ListGroup } from '@/components/List'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { addDays, todayISO } from '@/core/dates'
import { formatDateShort, formatMoney } from '@/core/format'
import { monthlyEquivalent, nextOccurrence } from '@/core/recurring'
import type { Recurring } from '@/core/types'
import { useAccounts, useAllCards, useCategoryMap, useRecurring, useSettings } from '@/db/hooks'
import { FREQUENCY_LABEL, WEEKDAYS } from '@/lib/labels'

export function scheduleLabel(r: Pick<Recurring, 'frequency' | 'day'>): string {
  if (r.frequency === 'weekly') return `Cada ${WEEKDAYS[r.day]?.toLowerCase() ?? ''}`
  return `${FREQUENCY_LABEL[r.frequency]} · día ${r.day}`
}

export function RecurringScreen() {
  const navigate = useNavigate()
  const rules = useRecurring()
  const categories = useCategoryMap()
  const cards = useAllCards()
  const accounts = useAccounts(true)
  const settings = useSettings()
  const privateMode = settings?.privateMode ?? false
  const today = todayISO()

  const expenses = rules?.filter((r) => r.kind === 'expense') ?? []
  const incomes = rules?.filter((r) => r.kind === 'income') ?? []
  const monthly = (list: Recurring[]) =>
    list.filter((r) => r.active && r.currency === 'ARS').reduce((sum, r) => sum + monthlyEquivalent(r.amount, r.frequency), 0)

  const row = (r: Recurring, last: boolean) => {
    const category = r.categoryId ? categories?.get(r.categoryId) : undefined
    const where = r.method === 'card' ? cards?.find((c) => c.id === r.cardId) : accounts?.find((a) => a.id === r.accountId)
    const whereLabel = where ? ('last4' in where ? `${where.name} •${where.last4}` : where.name) : 'Sin medio'
    const next = r.active ? nextOccurrence(r, addDays(today, -1)) : null
    return (
      <Pressable
        key={r.id}
        pressScale={1}
        onClick={() => navigate(`/ajustes/fijos/${r.id}`)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-2 ${last ? '' : 'border-b border-separator/60'} ${r.active ? '' : 'opacity-50'}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: `${category?.color ?? '#34c759'}26` }} aria-hidden>
          {category?.icon ?? (r.kind === 'income' ? <ArrowDownLeft size={20} className="text-green" /> : <Repeat size={20} />)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body">{r.name}</p>
          <p className="truncate text-footnote text-label-2">
            {scheduleLabel(r)} · {whereLabel}
            {r.method === 'card' && (r.installments ?? 1) > 1 ? ` · ${r.installments} cuotas` : ''}
          </p>
          <p className="text-footnote text-label-2">{r.active ? (next ? `Próximo: ${formatDateShort(next)}` : 'Terminado') : 'En pausa'}</p>
        </div>
        <span className={`tabular text-body font-semibold ${r.kind === 'income' ? 'text-green' : ''}`}>{formatMoney(r.amount, r.currency, { hide: privateMode })}</span>
      </Pressable>
    )
  }

  const add = (
    <Pressable pressScale={0.9} aria-label="Nuevo gasto fijo" onClick={() => navigate('/ajustes/fijos/nuevo')} className="flex items-center justify-center text-tint">
      <Plus size={26} />
    </Pressable>
  )

  if (rules && rules.length === 0) {
    return (
      <Screen title="Fijos y suscripciones" back="Ajustes" backTo="/ajustes" right={add}>
        <EmptyState
          icon={<Repeat size={56} strokeWidth={1.5} />}
          title="Sin gastos fijos"
          description="Alquiler, servicios, Netflix, el sueldo: cargalos una vez y se registran solos cada vez que llega el día."
          action={<Button onClick={() => navigate('/ajustes/fijos/nuevo')}>Agregar gasto fijo</Button>}
        />
      </Screen>
    )
  }

  return (
    <Screen title="Fijos y suscripciones" back="Ajustes" backTo="/ajustes" right={add}>
      <div className="grid grid-cols-2 gap-3 px-4">
        <div className="card p-3">
          <p className="text-footnote text-label-2">Gastos fijos por mes</p>
          <p className="tabular text-title3">{formatMoney(monthly(expenses), 'ARS', { hide: privateMode, fractionDigits: 0 })}</p>
        </div>
        <div className="card p-3">
          <p className="text-footnote text-label-2">Ingresos fijos por mes</p>
          <p className="tabular text-title3 text-green">{formatMoney(monthly(incomes), 'ARS', { hide: privateMode, fractionDigits: 0 })}</p>
        </div>
      </div>
      {expenses.length > 0 && <ListGroup title="Gastos y suscripciones">{expenses.map((r, i) => row(r, i === expenses.length - 1))}</ListGroup>}
      {incomes.length > 0 && <ListGroup title="Ingresos">{incomes.map((r, i) => row(r, i === incomes.length - 1))}</ListGroup>}
      <p className="px-8 pt-4 text-center text-footnote text-label-2">Se cargan solos al abrir la app el día que corresponde. Los que van con tarjeta aparecen como compra en su resumen.</p>
    </Screen>
  )
}
