import { Check, Circle, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { ListGroup, ListRow } from '@/components/List'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { todayISO } from '@/core/dates'
import { formatDate, formatDateShort, formatMoney, formatPeriodLong } from '@/core/format'
import { convertCents } from '@/core/money'
import { statementDates, summarizeStatement } from '@/core/statements'
import type { CardPayment } from '@/core/types'
import { addCardPayment, deleteCardPayment } from '@/db'
import { DatesSheet } from './DatesSheet'
import { PAYMENT_KIND_LABEL } from './labels'
import { PaymentSheet } from './PaymentSheet'
import { StatusChip } from './StatementRow'
import { useAccounts, useCard, useCardInstallments, useCardOverrides, useCardPayments, usePurchasesById, useSettings } from './hooks'

export function StatementDetail() {
  const { cardId, period } = useParams()
  const navigate = useNavigate()
  const card = useCard(cardId)
  const installments = useCardInstallments(cardId)
  const payments = useCardPayments(cardId)
  const overrides = useCardOverrides(cardId)
  const accounts = useAccounts()
  const settings = useSettings()
  const [payOpen, setPayOpen] = useState(false)
  const [datesOpen, setDatesOpen] = useState(false)
  const privateMode = settings?.privateMode ?? false
  const usdRate = settings?.usdRate ?? 0

  const rows = useMemo(() => (installments ?? []).filter((i) => i.period === period).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.purchaseId.localeCompare(b.purchaseId) || a.number - b.number), [installments, period])
  const purchaseIds = useMemo(() => [...new Set(rows.map((r) => r.purchaseId))], [rows])
  const purchases = usePurchasesById(purchaseIds)

  if (!card || !period || !installments || !payments) return <Screen title="Resumen" back="Tarjetas" backTo="/tarjetas" compact>{null}</Screen>

  const summary = summarizeStatement({ card, period, installments, payments, today: todayISO(), overrides, ...(usdRate ? { usdRate } : {}) })
  const byRule = statementDates(card, period)
  const hasOverride = Boolean(overrides?.get(period))
  const usdInArs = usdRate > 0 ? convertCents(summary.totals.USD, 'USD', 'ARS', usdRate) : 0
  const suggestedTotal = summary.totals.ARS + usdInArs
  const periodPayments = payments.filter((p) => p.period === period).sort((a, b) => b.date.localeCompare(a.date))
  const accountName = (id?: string) => accounts?.find((a) => a.id === id)?.name

  const removePayment = async (p: CardPayment) => {
    await deleteCardPayment(p.id)
    toast('Pago eliminado', {
      actionLabel: 'Deshacer',
      onAction: () => addCardPayment({ cardId: p.cardId, period: p.period, amount: p.amount, kind: p.kind, date: p.date, ...(p.accountId ? { accountId: p.accountId } : {}), ...(p.note ? { note: p.note } : {}) }),
    })
  }

  return (
    <Screen title={formatPeriodLong(period)} back="Tarjetas" backTo="/tarjetas" compact>
      <div className="px-4 pt-4">
        <p className="text-subhead text-label-2">{card.name} •{card.last4}</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="tabular text-largetitle">{formatMoney(summary.totals.ARS, 'ARS', { hide: privateMode, fractionDigits: 0 })}</p>
          {summary.closed && summary.count > 0 && <StatusChip status={summary.payment.status} />}
        </div>
        {summary.totals.USD > 0 && (
          <p className="tabular text-title3 text-label-2">
            + {formatMoney(summary.totals.USD, 'USD', { hide: privateMode })}
            {usdInArs > 0 && <span className="text-subhead"> ≈ {formatMoney(usdInArs, 'ARS', { hide: privateMode, fractionDigits: 0 })}</span>}
          </p>
        )}
      </div>

      <ListGroup title="Fechas" footer={hasOverride ? 'Fechas corregidas a mano para este resumen.' : undefined}>
        <ListRow label={summary.closed ? 'Cerró' : 'Cierra'} value={formatDate(summary.closingDate)} />
        <ListRow label="Vence" value={formatDate(summary.dueDate)} />
        <ListRow label="Corregir fechas reales" chevron onPress={() => setDatesOpen(true)} last />
      </ListGroup>

      {summary.count > 0 && (
        <ListGroup title="Pago">
          <ListRow label="Pagado" value={formatMoney(summary.payment.paid, 'ARS', { hide: privateMode })} />
          <ListRow label="Resta" value={formatMoney(summary.payment.remaining, 'ARS', { hide: privateMode })} />
          {periodPayments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-separator/60 px-4 py-2">
              <div className="flex-1">
                <p className="text-body">{PAYMENT_KIND_LABEL[p.kind]}</p>
                <p className="text-footnote text-label-2">{formatDateShort(p.date)}{accountName(p.accountId) ? ` · ${accountName(p.accountId)}` : ''}</p>
              </div>
              <span className="tabular text-body">{formatMoney(p.amount, 'ARS', { hide: privateMode })}</span>
              <Pressable pressScale={0.9} aria-label="Eliminar pago" onClick={() => void removePayment(p)} className="flex items-center justify-center text-red">
                <Trash2 size={18} />
              </Pressable>
            </div>
          ))}
          <div className="p-3">
            <Button className="w-full" variant={summary.payment.status === 'paid' ? 'secondary' : 'primary'} onClick={() => setPayOpen(true)}>
              Registrar pago
            </Button>
          </div>
        </ListGroup>
      )}

      <ListGroup title={`Cuotas y consumos (${rows.length})`}>
        {rows.length === 0 && <p className="px-4 py-6 text-center text-subhead text-label-2">No hay cuotas en este resumen.</p>}
        {rows.map((i, idx) => {
          const p = purchases?.get(i.purchaseId)
          return (
            <Pressable key={i.id} pressScale={1} onClick={() => navigate(`/compras/${i.purchaseId}`)} className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-2 ${idx === rows.length - 1 ? '' : 'border-b border-separator/60'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${i.status === 'paid' ? 'bg-green text-white' : 'text-label-3'}`} aria-hidden>
                {i.status === 'paid' ? <Check size={14} strokeWidth={3} /> : <Circle size={20} strokeWidth={1.5} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body">{p?.description ?? 'Compra'}</p>
                <p className="text-footnote text-label-2">{i.count === 1 ? 'Único pago' : `Cuota ${i.number}/${i.count}`}{p?.merchant ? ` · ${p.merchant}` : ''}</p>
              </div>
              <span className="tabular text-body font-semibold">{formatMoney(i.amount, i.currency, { hide: privateMode })}</span>
            </Pressable>
          )
        })}
      </ListGroup>

      <PaymentSheet open={payOpen} onClose={() => setPayOpen(false)} cardId={card.id} period={period} suggestedTotal={suggestedTotal} accounts={accounts ?? []} />
      <DatesSheet open={datesOpen} onClose={() => setDatesOpen(false)} cardId={card.id} period={period} current={summary} byRule={byRule} hasOverride={hasOverride} />
    </Screen>
  )
}
