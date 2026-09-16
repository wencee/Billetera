import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ListGroup } from '@/components/List'
import { Screen } from '@/components/Screen'
import { addPeriods, comparePeriods, periodsBetween, todayISO } from '@/core/dates'
import { formatMoney } from '@/core/format'
import { projectCommitments } from '@/core/projection'
import { currentPeriod, sumByCurrency, summarizeStatement, type StatementSummary } from '@/core/statements'
import { StatementRow } from './StatementRow'
import { useCard, useCardInstallments, useCardOverrides, useCardPayments, useRecurringOnCard, useSettings } from './hooks'

const FUTURE_MONTHS = 12

/** Todos los resúmenes de una tarjeta: cerrados con su estado y los próximos 12 con lo comprometido. */
export function StatementsList() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const card = useCard(cardId)
  const installments = useCardInstallments(cardId)
  const payments = useCardPayments(cardId)
  const overrides = useCardOverrides(cardId)
  const recurring = useRecurringOnCard(cardId)
  const settings = useSettings()
  const privateMode = settings?.privateMode ?? false
  const today = todayISO()

  const data = useMemo(() => {
    if (!card || !installments || !payments) return null
    const current = currentPeriod(card, today, overrides)
    const base = { card, installments, payments, today, overrides, ...(settings?.usdRate ? { usdRate: settings.usdRate } : {}) }
    const earliest = installments.reduce<string | null>((min, i) => (min === null || comparePeriods(i.period, min) < 0 ? i.period : min), null)
    const past: StatementSummary[] = earliest && comparePeriods(earliest, current) < 0
      ? periodsBetween(earliest, addPeriods(current, -1)).map((period) => summarizeStatement({ ...base, period })).filter((s) => s.count > 0)
      : []
    const projection = projectCommitments({
      cards: [card],
      installments: installments.filter((i) => i.status === 'pending'),
      recurring: (recurring ?? []).filter((r) => r.cardId && r.kind === 'expense').map((r) => ({
        cardId: r.cardId!, amount: r.amount, currency: r.currency, active: r.active, frequency: r.frequency, day: r.day,
        startDate: r.startDate, endDate: r.endDate, installments: r.installments, lastGeneratedUntil: r.lastGeneratedUntil,
      })),
      fromPeriod: current,
      months: FUTURE_MONTHS,
      today,
      overridesFor: () => overrides,
    })
    // Total mostrado = todas las cuotas del período (pagadas o no) + suscripciones proyectadas.
    // La proyección solo suma cuotas pendientes, así que la parte de suscripciones es la diferencia.
    const future = projection.map((row) => {
      const summary = summarizeStatement({ ...base, period: row.period })
      const projected = row.byCard[card.id] ?? { ARS: 0, USD: 0 }
      const pending = sumByCurrency(installments.filter((i) => i.period === row.period && i.status === 'pending'))
      const extra = { ARS: projected.ARS - pending.ARS, USD: projected.USD - pending.USD }
      const totals = { ARS: summary.totals.ARS + extra.ARS, USD: summary.totals.USD + extra.USD }
      return { summary: { ...summary, totals }, extra: extra.ARS + extra.USD }
    })
    const committed = future.reduce((acc, f) => ({ ARS: acc.ARS + f.summary.totals.ARS, USD: acc.USD + f.summary.totals.USD }), { ARS: 0, USD: 0 })
    return { past: past.reverse(), future, committed }
  }, [card, installments, payments, overrides, recurring, settings?.usdRate, today])

  if (!card || !data) return <Screen title="Resúmenes" back="Tarjetas" backTo="/tarjetas" compact>{null}</Screen>

  return (
    <Screen title={`Resúmenes · ${card.name}`} back="Tarjetas" backTo="/tarjetas" compact>
      <div className="card mx-4 mt-4 p-4">
        <p className="text-footnote uppercase text-label-2">Comprometido en los próximos {FUTURE_MONTHS} resúmenes</p>
        <p className="tabular mt-1 text-title1">{formatMoney(data.committed.ARS, 'ARS', { hide: privateMode, fractionDigits: 0 })}</p>
        {data.committed.USD > 0 && <p className="tabular text-subhead text-label-2">+ {formatMoney(data.committed.USD, 'USD', { hide: privateMode, fractionDigits: 0 })}</p>}
        {data.future.some((f) => f.extra > 0) && <p className="mt-1 text-footnote text-label-2">Incluye las suscripciones que se cobran con esta tarjeta.</p>}
      </div>

      <ListGroup title="Próximos">
        {data.future.map(({ summary }, i) => (
          <StatementRow key={summary.period} summary={summary} privateMode={privateMode} onPress={() => navigate(`/tarjetas/${card.id}/resumenes/${summary.period}`)} last={i === data.future.length - 1} />
        ))}
      </ListGroup>

      {data.past.length > 0 && (
        <ListGroup title="Cerrados">
          {data.past.map((summary, i) => (
            <StatementRow key={summary.period} summary={summary} privateMode={privateMode} onPress={() => navigate(`/tarjetas/${card.id}/resumenes/${summary.period}`)} last={i === data.past.length - 1} />
          ))}
        </ListGroup>
      )}
    </Screen>
  )
}
