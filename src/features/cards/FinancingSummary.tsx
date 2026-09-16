import { formatMoney, formatPct } from '@/core/format'
import type { FinancingAnalysis } from '@/core/interest'
import type { Currency } from '@/core/types'

interface Props {
  analysis: FinancingAnalysis
  cashPrice: number
  currency: Currency
  count: number
  privateMode?: boolean
}

/** Comparación "contado vs. financiado" con cuota, total, interés y tasas. */
export function FinancingSummary({ analysis, cashPrice, currency, count, privateMode = false }: Props) {
  const fmt = (c: number) => formatMoney(c, currency, { hide: privateMode })
  const hasInterest = analysis.totalInterest !== 0
  const ratio = cashPrice > 0 ? Math.min(1, cashPrice / Math.max(cashPrice, analysis.totalAmount)) : 1
  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <span className="text-subhead text-label-2">{count} {count === 1 ? 'pago' : 'cuotas'} de</span>
        <span className="tabular text-title2">{fmt(analysis.installmentAmount)}</span>
      </div>
      <div className="px-4 pt-3">
        <div className="flex justify-between text-footnote text-label-2">
          <span>Contado</span>
          <span>Financiado</span>
        </div>
        <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-fill">
          <div className="h-full rounded-full bg-tint" style={{ width: `${ratio * 100}%` }} />
          {hasInterest && analysis.totalInterest > 0 && <div className="h-full bg-orange" style={{ width: `${(1 - ratio) * 100}%` }} />}
        </div>
        <div className="mt-1 flex justify-between text-subhead">
          <span className="tabular">{fmt(cashPrice)}</span>
          <span className="tabular font-semibold">{fmt(analysis.totalAmount)}</span>
        </div>
      </div>
      <dl className="mt-3 divide-y divide-separator/60 border-t border-separator/60 text-subhead">
        <Row label="Interés total" value={hasInterest ? `${fmt(analysis.totalInterest)} · ${formatPct(analysis.surchargePct)}` : 'Sin interés'} tone={analysis.totalInterest > 0 ? 'text-orange' : analysis.totalInterest < 0 ? 'text-green' : ''} />
        {hasInterest && analysis.monthlyRate > 0 && (
          <>
            <Row label="TNA estimada" value={formatPct(analysis.tna)} />
            <Row label="TEA estimada" value={formatPct(analysis.tea)} />
            <Row label="Tasa mensual" value={formatPct(analysis.monthlyRate, 2)} />
          </>
        )}
      </dl>
    </div>
  )
}

function Row({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between px-4 py-2">
      <dt className="text-label-2">{label}</dt>
      <dd className={`tabular ${tone}`}>{value}</dd>
    </div>
  )
}
