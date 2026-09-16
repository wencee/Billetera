import { ChevronRight } from 'lucide-react'
import { Pressable } from '@/components/Pressable'
import { formatDateShort, formatMoney } from '@/core/format'
import { purchaseBadge, type PurchaseProgress } from '@/core/purchases'
import type { Category, Purchase } from '@/core/types'

interface Props {
  purchase: Purchase
  progress: PurchaseProgress
  category?: Category
  privateMode?: boolean
  onPress: () => void
  last?: boolean
}

export function PurchaseRow({ purchase, progress, category, privateMode = false, onPress, last }: Props) {
  const badge = purchaseBadge(purchase, progress)
  const done = progress.remaining === 0
  return (
    <Pressable pressScale={1} onClick={onPress} className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-2 ${last ? '' : 'border-b border-separator/60'}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: `${category?.color ?? '#8e8e93'}22` }} aria-hidden>
        {category?.icon ?? '💳'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body">{purchase.description}</p>
        <p className="truncate text-footnote text-label-2">
          {purchase.merchant ? `${purchase.merchant} · ` : ''}
          {formatDateShort(purchase.date)}
        </p>
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-caption1 font-semibold ${done ? 'bg-green/15 text-green' : purchase.financing === 'interest' ? 'bg-orange/15 text-orange' : 'bg-fill text-label-2'}`}>
          {done ? `Saldada · ${badge}` : badge}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="tabular text-body font-semibold">{formatMoney(purchase.installmentAmount, purchase.currency, { hide: privateMode })}</span>
        {purchase.installments > 1 && <span className="text-caption1 text-label-2">por cuota</span>}
      </div>
      <ChevronRight size={18} className="text-label-3" aria-hidden />
    </Pressable>
  )
}
