import { ChevronRight } from 'lucide-react'
import { Pressable } from '@/components/Pressable'
import { formatDateShort, formatMoney, formatPeriod } from '@/core/format'
import type { StatementSummary } from '@/core/statements'
import { STATUS_LABEL, STATUS_TONE } from './labels'

interface Props {
  label?: string
  summary: StatementSummary
  privateMode?: boolean
  onPress: () => void
  last?: boolean
}

export function StatusChip({ status }: { status: StatementSummary['payment']['status'] }) {
  return <span className={`rounded-full px-2 py-0.5 text-caption1 font-semibold ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
}

/** Fila de resumen: etiqueta, período, cierre/vencimiento, totales y estado. */
export function StatementRow({ label, summary, privateMode = false, onPress, last }: Props) {
  const { totals, closed, payment } = summary
  return (
    <Pressable pressScale={1} onClick={onPress} className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-2 ${last ? '' : 'border-b border-separator/60'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold">{label ?? formatPeriod(summary.period)}</span>
          {label && <span className="text-subhead text-label-2">{formatPeriod(summary.period)}</span>}
        </div>
        <p className="text-footnote text-label-2">
          {closed ? 'Cerró' : 'Cierra'} {formatDateShort(summary.closingDate)} · vence {formatDateShort(summary.dueDate)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="tabular text-body font-semibold">{formatMoney(totals.ARS, 'ARS', { hide: privateMode, fractionDigits: 0 })}</span>
        {totals.USD > 0 && <span className="tabular text-footnote text-label-2">{formatMoney(totals.USD, 'USD', { hide: privateMode, fractionDigits: 0 })}</span>}
        {closed && summary.count > 0 && <StatusChip status={payment.status} />}
      </div>
      <ChevronRight size={18} className="text-label-3" aria-hidden />
    </Pressable>
  )
}
