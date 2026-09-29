import { PiggyBank, Plus, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { create } from 'zustand'
import { EmptyState } from '@/components/EmptyState'
import { Segmented } from '@/components/form/Segmented'
import { ListGroup } from '@/components/List'
import { ProgressRing } from '@/components/ProgressRing'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { totalsByCurrency } from '@/core/balances'
import { todayISO } from '@/core/dates'
import { formatDateShort, formatMoney, formatPct } from '@/core/format'
import { summarizeGoal, type GoalSummary } from '@/core/goals'
import { investmentValue, maturingSoon, netWorth, portfolioTotals } from '@/core/investments'
import type { Cents, Currency, Goal, GoalEntry, Investment } from '@/core/types'
import { useAccountBalances, useAccounts, useGoalEntries, useGoals, useInvestments, useSettings } from '@/db/hooks'
import { INVESTMENT_TYPE_ICON, INVESTMENT_TYPE_LABEL } from '@/lib/labels'
import { goalColor, goalHint } from './goalText'

type Tab = 'goals' | 'investments'
/** La pestaña elegida se recuerda al ir y volver del detalle. */
const useTab = create<{ tab: Tab; setTab: (t: Tab) => void }>((set) => ({ tab: 'goals', setTab: (tab) => set({ tab }) }))

export function GoalsScreen() {
  const navigate = useNavigate()
  const { tab, setTab } = useTab()
  const goals = useGoals()
  const entries = useGoalEntries()
  const investments = useInvestments()
  const accounts = useAccounts()
  const balances = useAccountBalances()
  const settings = useSettings()
  const hide = settings?.privateMode ?? false
  const today = todayISO()

  const entriesByGoal = useMemo(() => {
    const map = new Map<string, GoalEntry[]>()
    for (const e of entries ?? []) map.set(e.goalId, [...(map.get(e.goalId) ?? []), e])
    return map
  }, [entries])

  const summaries = useMemo(
    () => new Map((goals ?? []).map((g) => [g.id, summarizeGoal(g, entriesByGoal.get(g.id) ?? [], today)])),
    [goals, entriesByGoal, today],
  )

  const worth = useMemo(() => {
    if (!accounts || !balances || !goals || !investments) return null
    const savedInGoals: Record<Currency, Cents> = { ARS: 0, USD: 0 }
    for (const g of goals) savedInGoals[g.currency] += Math.max(0, summaries.get(g.id)?.saved ?? 0)
    return netWorth({ accounts: totalsByCurrency(accounts, balances), goals: savedInGoals, investments: portfolioTotals(investments, today).value }, settings?.usdRate ?? 0)
  }, [accounts, balances, goals, investments, summaries, settings?.usdRate, today])

  const add = (
    <Pressable
      pressScale={0.9}
      aria-label={tab === 'goals' ? 'Nueva meta' : 'Nueva inversión'}
      onClick={() => navigate(tab === 'goals' ? '/metas/nueva' : '/metas/inversiones/nueva')}
      className="flex items-center justify-center text-tint"
    >
      <Plus size={26} />
    </Pressable>
  )

  return (
    <Screen title="Metas y ahorros" right={add}>
      {worth && <NetWorthCard worth={worth} hide={hide} />}

      <div className="px-4 pt-5">
        <Segmented<Tab> aria-label="Sección" value={tab} onChange={setTab} options={[{ value: 'goals', label: 'Metas' }, { value: 'investments', label: 'Inversiones' }]} />
      </div>

      {tab === 'goals' ? (
        <GoalsList goals={goals} summaries={summaries} hide={hide} />
      ) : (
        <InvestmentsList investments={investments} today={today} hide={hide} alertDays={settings?.alertDaysAhead ?? 3} />
      )}
    </Screen>
  )
}

function NetWorthCard({ worth, hide }: { worth: ReturnType<typeof netWorth>; hide: boolean }) {
  const money = (c: Cents, cur: Currency = 'ARS') => formatMoney(c, cur, { hide, fractionDigits: 0 })
  const rows: [string, Record<Currency, Cents>, string][] = [
    ['Cuentas', worth.accounts, 'bg-tint'],
    ['Metas', worth.goals, 'bg-pink'],
    ['Inversiones', worth.investments, 'bg-green'],
  ]
  const totalArsOnly = rows.reduce((s, [, v]) => s + Math.max(0, v.ARS), 0)
  return (
    <div className="card mx-4 p-4">
      <p className="text-footnote uppercase text-label-2">Patrimonio</p>
      <p className="tabular mt-1 text-title1">{worth.totalARS !== null ? money(worth.totalARS) : money(worth.total.ARS)}</p>
      {worth.totalARS === null && worth.total.USD !== 0 && <p className="tabular text-subhead text-label-2">+ {money(worth.total.USD, 'USD')} (cargá la cotización para sumarlos)</p>}
      {worth.totalARS !== null && worth.total.USD !== 0 && <p className="text-footnote text-label-2">Incluye {money(worth.total.USD, 'USD')} a la cotización cargada</p>}
      {totalArsOnly > 0 && (
        <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-fill" aria-hidden>
          {rows.map(([label, v, color]) => (v.ARS > 0 ? <div key={label} className={`h-full ${color}`} style={{ width: `${(v.ARS / totalArsOnly) * 100}%` }} /> : null))}
        </div>
      )}
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {rows.map(([label, v, color]) => (
          <div key={label}>
            <dt className="flex items-center gap-1.5 text-caption1 text-label-2">
              <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />
              {label}
            </dt>
            <dd className="tabular text-subhead font-semibold">{money(v.ARS)}</dd>
            {v.USD !== 0 && <dd className="tabular text-caption1 text-label-2">+ {money(v.USD, 'USD')}</dd>}
          </div>
        ))}
      </dl>
    </div>
  )
}

function GoalsList({ goals, summaries, hide }: { goals: Goal[] | undefined; summaries: Map<string, GoalSummary>; hide: boolean }) {
  const navigate = useNavigate()
  if (!goals) return null
  const active = goals.filter((g) => !g.archived)
  const archived = goals.filter((g) => g.archived)
  if (goals.length === 0) {
    return (
      <EmptyState
        icon={<PiggyBank size={56} strokeWidth={1.5} />}
        title="Poné una meta"
        description="Un viaje, un fondo de emergencia, algo que quieras comprar. Te digo cuánto aportar por mes para llegar a tiempo."
        action={<Button onClick={() => navigate('/metas/nueva')}>Nueva meta</Button>}
      />
    )
  }
  const row = (g: Goal, last: boolean) => {
    const s = summaries.get(g.id)
    if (!s) return null
    return (
      <Pressable key={g.id} pressScale={1} onClick={() => navigate(`/metas/${g.id}`)} className={`flex w-full items-center gap-4 px-4 py-3 text-left active:bg-fill-2 ${last ? '' : 'border-b border-separator/60'}`}>
        <ProgressRing value={s.pct} size={56} stroke={5} color={goalColor(s)} label={`${g.name}: ${Math.round(s.pct * 100)} %`}>
          <span className="text-2xl" aria-hidden>{g.emoji}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-body font-semibold">{g.name}</p>
            <span className="tabular text-subhead text-label-2">{Math.floor(s.pct * 100)} %</span>
          </div>
          <p className="tabular text-subhead text-label-2">
            {formatMoney(s.saved, g.currency, { hide, fractionDigits: 0 })} de {formatMoney(g.targetAmount, g.currency, { hide, fractionDigits: 0 })}
          </p>
          <p className={`text-footnote ${s.status === 'done' ? 'text-green' : s.status === 'behind' || s.status === 'overdue' ? 'text-orange' : 'text-label-2'}`}>{goalHint(s, g.currency, hide)}</p>
        </div>
      </Pressable>
    )
  }
  return (
    <>
      {active.length > 0 && <ListGroup title="Metas">{active.map((g, i) => row(g, i === active.length - 1))}</ListGroup>}
      {archived.length > 0 && <ListGroup title="Archivadas">{archived.map((g, i) => row(g, i === archived.length - 1))}</ListGroup>}
    </>
  )
}

function InvestmentsList({ investments, today, hide, alertDays }: { investments: Investment[] | undefined; today: string; hide: boolean; alertDays: number }) {
  const navigate = useNavigate()
  if (!investments) return null
  if (investments.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={56} strokeWidth={1.5} />}
        title="Sin inversiones cargadas"
        description="Plazos fijos, FCI, dólares o cripto. El plazo fijo calcula solo los intereses y te avisa cuando vence."
        action={<Button onClick={() => navigate('/metas/inversiones/nueva')}>Nueva inversión</Button>}
      />
    )
  }
  const open = investments.filter((i) => !i.closed)
  const closed = investments.filter((i) => i.closed)
  const totals = portfolioTotals(open, today)
  const soon = maturingSoon(open, today, alertDays)
  const money = (c: Cents, cur: Currency) => formatMoney(c, cur, { hide, fractionDigits: 0 })

  const row = (inv: Investment, last: boolean) => {
    const v = investmentValue(inv, today)
    const detail =
      inv.closed ? `Cerrada ${inv.closedAt ? formatDateShort(inv.closedAt) : ''}`
      : inv.type === 'plazo_fijo' && inv.maturityDate ? `Vence ${formatDateShort(inv.maturityDate)}`
      : v.source === 'manual' && inv.currentValueDate ? `Valuado ${formatDateShort(inv.currentValueDate)}`
      : `Desde ${formatDateShort(inv.date)}`
    return (
      <Pressable key={inv.id} pressScale={1} onClick={() => navigate(`/metas/inversiones/${inv.id}`)} className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-2 ${last ? '' : 'border-b border-separator/60'} ${inv.closed ? 'opacity-60' : ''}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green/15 text-xl" aria-hidden>{INVESTMENT_TYPE_ICON[inv.type]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body">{inv.name}</p>
          <p className="truncate text-footnote text-label-2">{INVESTMENT_TYPE_LABEL[inv.type]} · {detail}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="tabular text-body font-semibold">{money(v.value, inv.currency)}</span>
          {v.gain !== 0 && (
            <span className={`tabular text-caption1 ${v.gain > 0 ? 'text-green' : 'text-red'}`}>
              {v.gain > 0 ? '+' : ''}
              {formatPct(v.gainPct)}
            </span>
          )}
        </div>
      </Pressable>
    )
  }

  const gainARS = totals.value.ARS - totals.invested.ARS
  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <div className="card p-3">
          <p className="text-footnote text-label-2">Valor hoy</p>
          <p className="tabular text-title3">{money(totals.value.ARS, 'ARS')}</p>
          {totals.value.USD > 0 && <p className="tabular text-footnote text-label-2">+ {money(totals.value.USD, 'USD')}</p>}
        </div>
        <div className="card p-3">
          <p className="text-footnote text-label-2">Ganancia en pesos</p>
          <p className={`tabular text-title3 ${gainARS > 0 ? 'text-green' : gainARS < 0 ? 'text-red' : ''}`}>{formatMoney(gainARS, 'ARS', { hide, fractionDigits: 0, signed: true })}</p>
          {totals.invested.ARS > 0 && <p className="tabular text-footnote text-label-2">{formatPct(gainARS / totals.invested.ARS)} sobre {money(totals.invested.ARS, 'ARS')}</p>}
        </div>
      </div>
      {soon.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl bg-orange/15 px-4 py-3 text-subhead text-orange">
          {soon.map(({ investment, state, daysLeft }) => (
            <p key={investment.id}>
              {investment.name}: {state === 'today' ? 'vence hoy' : state === 'matured' ? `venció hace ${-daysLeft} días` : `vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`}
            </p>
          ))}
        </div>
      )}
      {open.length > 0 && <ListGroup title="Abiertas">{open.map((inv, i) => row(inv, i === open.length - 1))}</ListGroup>}
      {closed.length > 0 && <ListGroup title="Cerradas">{closed.map((inv, i) => row(inv, i === closed.length - 1))}</ListGroup>}
    </>
  )
}
