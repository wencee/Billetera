import { ArrowDownLeft, ArrowLeftRight, CreditCard } from 'lucide-react'
import { formatMoney } from '@/core/format'
import type { Movement } from '@/core/movements'
import type { Category } from '@/core/types'

interface Props {
  movement: Movement
  category?: Category | undefined
  privateMode?: boolean
  last?: boolean
}

function Icon({ movement, category }: Pick<Props, 'movement' | 'category'>) {
  if (category) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: `${category.color}26` }} aria-hidden>
        {category.icon}
      </span>
    )
  }
  const { kind } = movement
  const Glyph = kind === 'income' ? ArrowDownLeft : kind === 'transfer' ? ArrowLeftRight : CreditCard
  const tone = kind === 'income' ? 'bg-green/15 text-green' : kind === 'transfer' ? 'bg-tint/15 text-tint' : 'bg-fill text-label-2'
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden>
      <Glyph size={20} />
    </span>
  )
}

/** Fila de movimiento: ícono, título, detalle y monto con signo (verde si entra). */
export function MovementRow({ movement: m, category, privateMode = false, last }: Props) {
  const sign = m.direction === 'in' ? '+' : m.direction === 'out' ? '−' : ''
  const amount = formatMoney(m.amount, m.currency, { hide: privateMode })
  return (
    <div className={`flex min-h-[60px] items-center gap-3 px-4 py-2.5 ${last ? '' : 'border-b border-separator/60'}`}>
      <Icon movement={m} category={category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body">{m.title}</p>
        <p className="truncate text-footnote text-label-2">{m.detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className={`tabular text-body font-semibold ${m.direction === 'in' ? 'text-green' : ''}`}>
          {sign}
          {amount}
        </span>
        {m.toAmount !== undefined && m.toCurrency && (
          <span className="tabular text-caption1 text-label-2">→ {formatMoney(m.toAmount, m.toCurrency, { hide: privateMode })}</span>
        )}
        {m.kind === 'card' && m.installments && m.installments > 1 && <span className="text-caption1 text-label-2">en {m.installments} cuotas</span>}
      </div>
    </div>
  )
}
