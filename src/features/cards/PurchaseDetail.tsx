import { Check, Circle } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { ListGroup, ListRow } from '@/components/List'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { formatDate, formatDateShort, formatMoney, formatPeriod } from '@/core/format'
import { analyzeFinancing } from '@/core/interest'
import { convertCents } from '@/core/money'
import { purchaseBadge, purchaseProgress } from '@/core/purchases'
import type { Installment } from '@/core/types'
import { deletePurchase, restorePurchase, setInstallmentStatus } from '@/db'
import { FinancingSummary } from './FinancingSummary'
import { useCard, useCategories, usePurchase, usePurchaseInstallments, useSettings } from './hooks'

export function PurchaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const purchase = usePurchase(id)
  const installments = usePurchaseInstallments(id)
  const card = useCard(purchase?.cardId)
  const categories = useCategories('expense')
  const settings = useSettings()
  const privateMode = settings?.privateMode ?? false

  const analysis = useMemo(() => {
    if (!purchase) return null
    try {
      return analyzeFinancing({ cashPrice: purchase.cashPrice, count: purchase.installments, financing: purchase.financing, ...(purchase.interestInput ? { interestInput: purchase.interestInput } : {}) })
    } catch {
      return null
    }
  }, [purchase])

  if (!purchase || !installments) return <Screen title="Compra" back="Tarjetas" backTo="/tarjetas" compact>{null}</Screen>

  const progress = purchaseProgress(installments)
  const category = categories?.find((c) => c.id === purchase.categoryId)
  const usdRate = settings?.usdRate ?? 0
  const converted = purchase.currency === 'USD' && usdRate > 0 ? convertCents(purchase.totalAmount, 'USD', 'ARS', usdRate) : null

  const remove = async () => {
    const snapshot = await deletePurchase(purchase.id)
    navigate(-1)
    if (snapshot) {
      toast('Compra borrada', { actionLabel: 'Deshacer', onAction: () => restorePurchase(snapshot) })
    }
  }

  const toggle = (i: Installment) => void setInstallmentStatus(i.id, i.status === 'paid' ? 'pending' : 'paid')

  return (
    <Screen
      title={purchase.description}
      back="Tarjetas" backTo="/tarjetas"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body text-tint" onClick={() => navigate(`/compras/${purchase.id}/editar`)}>
          Editar
        </Pressable>
      }
    >
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ background: `${category?.color ?? '#8e8e93'}22` }} aria-hidden>
            {category?.icon ?? '💳'}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-title2">{purchase.description}</h1>
            <p className="text-subhead text-label-2">
              {[purchase.merchant, category?.name, card ? `${card.name} •${card.last4}` : null].filter(Boolean).join(' · ')}
            </p>
            <p className="text-subhead text-label-2">{formatDate(purchase.date)}</p>
          </div>
        </div>
        <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-caption1 font-semibold ${purchase.financing === 'interest' ? 'bg-orange/15 text-orange' : 'bg-fill text-label-2'}`}>
          {purchaseBadge(purchase, progress)}
        </span>
      </div>

      {analysis && (
        <div className="px-4 pt-5">
          <FinancingSummary analysis={analysis} cashPrice={purchase.cashPrice} currency={purchase.currency} count={purchase.installments} privateMode={privateMode} />
        </div>
      )}

      <ListGroup title="Estado" footer={converted !== null ? `Total en pesos a la cotización cargada: ${formatMoney(converted, 'ARS', { hide: privateMode })}` : undefined}>
        <ListRow label="Cuotas pagadas" value={`${progress.paid} de ${progress.count}`} />
        <ListRow label="Saldo pendiente" value={formatMoney(progress.pendingAmount, purchase.currency, { hide: privateMode })} />
        <ListRow label="Primera cuota" value={formatPeriod(purchase.firstPeriod)} />
        <ListRow label="Última cuota vence" value={progress.lastDueDate ? formatDate(progress.lastDueDate) : '—'} last />
      </ListGroup>

      <ListGroup title="Cronograma de cuotas" footer="Tocá una cuota para marcarla pagada o pendiente. Pagar un resumen completo las marca todas juntas.">
        {installments.map((i, idx) => (
          <Pressable
            key={i.id}
            pressScale={1}
            onClick={() => toggle(i)}
            aria-label={`Cuota ${i.number} de ${i.count}, ${i.status === 'paid' ? 'pagada' : 'pendiente'}`}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-2 ${idx === installments.length - 1 ? '' : 'border-b border-separator/60'}`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${i.status === 'paid' ? 'bg-green text-white' : 'text-label-3'}`} aria-hidden>
              {i.status === 'paid' ? <Check size={16} strokeWidth={3} /> : <Circle size={22} strokeWidth={1.5} />}
            </span>
            <div className="flex-1">
              <p className={`text-body ${i.status === 'paid' ? 'text-label-2' : ''}`}>
                Cuota {i.number}/{i.count} · {formatPeriod(i.period)}
              </p>
              <p className="text-footnote text-label-2">Vence {formatDateShort(i.dueDate)}{i.paidAt ? ` · pagada ${formatDateShort(i.paidAt)}` : ''}</p>
            </div>
            <span className={`tabular text-body ${i.status === 'paid' ? 'text-label-2 line-through' : 'font-semibold'}`}>{formatMoney(i.amount, i.currency, { hide: privateMode })}</span>
          </Pressable>
        ))}
      </ListGroup>

      {purchase.notes && (
        <ListGroup title="Notas">
          <p className="whitespace-pre-wrap px-4 py-3 text-body">{purchase.notes}</p>
        </ListGroup>
      )}

      <div className="px-4 pt-8">
        <Button variant="destructive" className="w-full" onClick={() => void remove()}>
          Borrar compra
        </Button>
      </div>
    </Screen>
  )
}
