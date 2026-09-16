import { Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { ProgressBar } from '@/components/ProgressBar'
import { formatMoney } from '@/core/format'
import type { LimitSummary } from '@/core/limits'
import type { Card } from '@/core/types'
import { NETWORK_LABEL } from './labels'

interface Props {
  card: Card
  limit?: LimitSummary
  privateMode?: boolean
  onEdit?: () => void
  footer?: ReactNode
}

function NetworkMark({ network }: { network: Card['network'] }) {
  if (network === 'mastercard') {
    return (
      <span className="flex items-center" aria-label="Mastercard">
        <span className="h-7 w-7 rounded-full bg-[#eb001b]/90" />
        <span className="-ml-3 h-7 w-7 rounded-full bg-[#f79e1b]/90" />
      </span>
    )
  }
  return <span className="text-title3 font-extrabold italic tracking-tight">{NETWORK_LABEL[network]}</span>
}

/** Tarjeta "física": gradiente del color elegido, chip, red, últimos 4 y límite disponible. */
export function CreditCardFace({ card, limit, privateMode = false, onEdit, footer }: Props) {
  const usedPct = limit?.usedPct ?? 0
  const tone = usedPct >= 1 ? 'red' : usedPct >= 0.8 ? 'orange' : 'white'
  return (
    <div
      className="relative aspect-[1.586] w-full select-none overflow-hidden rounded-2xl p-5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
      style={{ background: `linear-gradient(135deg, ${card.color} 0%, color-mix(in srgb, ${card.color} 55%, black) 100%)` }}
    >
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" aria-hidden />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-headline">{card.name}</p>
            {card.bank && <p className="text-footnote text-white/70">{card.bank}</p>}
          </div>
          {onEdit && (
            <button type="button" onClick={onEdit} aria-label="Editar tarjeta" className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-white/80 active:bg-white/15">
              <Pencil size={18} />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="h-7 w-9 rounded-md bg-gradient-to-br from-[#f5d67a] to-[#c9a24a]" aria-hidden />
          <span className="tabular text-title3 tracking-[0.18em]">•••• {card.last4}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-caption1 uppercase tracking-wide text-white/70">Disponible</p>
            <p className="tabular text-title3 font-semibold">
              {limit ? formatMoney(limit.available, 'ARS', { hide: privateMode, fractionDigits: 0 }) : '—'}
              <span className="ml-1 text-footnote font-normal text-white/70">de {formatMoney(card.limit, 'ARS', { hide: privateMode, fractionDigits: 0 })}</span>
            </p>
            <ProgressBar value={usedPct} tone={tone} className="mt-2 bg-white/25" />
          </div>
          <NetworkMark network={card.network} />
        </div>
        {footer}
      </div>
    </div>
  )
}
