import { AlertOctagon, AlertTriangle, ChevronRight, Eye, EyeOff, Info, Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MovementRow } from '@/components/MovementRow'
import { ProgressBar } from '@/components/ProgressBar'
import { ProgressRing } from '@/components/ProgressRing'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import type { Alert, AlertLevel, AlertTarget } from '@/core/alerts'
import { budgetLevel } from '@/core/budgets'
import { todayISO } from '@/core/dates'
import { formatDateLong, formatMoney, formatPeriodLong } from '@/core/format'
import { loadSampleData, updateSettings } from '@/db'
import { useCategoryMap, useMovements, useSettings } from '@/db/hooks'
import { goalColor } from '@/features/goals/goalText'
import { movementOpenPath } from '@/features/movements/routes'
import { useDashboard } from './dashboard'

export function alertPath(t: AlertTarget): string {
  switch (t.type) {
    case 'statement': return `/tarjetas/${t.cardId}/resumenes/${t.period}`
    case 'budgets': return '/ajustes/presupuestos'
    case 'goal': return `/metas/${t.id}`
    case 'investment': return `/metas/inversiones/${t.id}`
    case 'settings': return '/ajustes'
  }
}

const LEVEL_UI: Record<AlertLevel, { Icon: typeof Info; tone: string; label: string }> = {
  danger: { Icon: AlertOctagon, tone: 'bg-red/15 text-red', label: 'Urgente' },
  warning: { Icon: AlertTriangle, tone: 'bg-orange/15 text-orange', label: 'Atención' },
  info: { Icon: Info, tone: 'bg-tint/15 text-tint', label: 'Aviso' },
}

function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="px-4 pt-6">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-title3">{title}</h2>
        {action && onAction && (
          <button type="button" onClick={onAction} className="flex items-center text-subhead text-tint active:opacity-60">
            {action}
            <ChevronRight size={16} aria-hidden />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export function HomeScreen() {
  const navigate = useNavigate()
  const dash = useDashboard()
  const movements = useMovements()
  const categories = useCategoryMap()
  const settings = useSettings()
  const [allAlerts, setAllAlerts] = useState(false)
  const hide = settings?.privateMode ?? false
  const today = todayISO()
  const money = (c: number) => formatMoney(c, 'ARS', { hide, fractionDigits: 0 })

  const settingsButton = (
    <div className="flex items-center">
      {/* Modo privado con un toque: tapa los montos (para mostrar el teléfono o en el colectivo). */}
      <Pressable
        pressScale={0.9}
        aria-label={hide ? 'Mostrar montos' : 'Ocultar montos'}
        aria-pressed={hide}
        onClick={() => void updateSettings({ privateMode: !hide })}
        className="flex items-center justify-center text-tint"
      >
        {hide ? <EyeOff size={24} /> : <Eye size={24} />}
      </Pressable>
      <Pressable pressScale={0.9} aria-label="Ajustes" onClick={() => navigate('/ajustes')} className="flex items-center justify-center text-tint">
        <SettingsIcon size={24} />
      </Pressable>
    </div>
  )

  if (!dash || !movements) return <Screen title="Inicio" right={settingsButton}>{null}</Screen>

  const empty = movements.length === 0
  const { overview: o, alerts } = dash
  const visibleAlerts = allAlerts ? alerts : alerts.slice(0, 4)
  const recent = movements.filter((m) => m.date <= today).slice(0, 5)

  return (
    <Screen title="Inicio" right={settingsButton}>
      <p className="-mt-1 px-4 text-subhead text-label-2 first-letter:uppercase">{formatDateLong(today)}</p>

      <section className="px-4 pt-4">
        <div className="card p-5">
          <p className="text-footnote uppercase text-label-2">Disponible en {formatPeriodLong(dash.month).split(' ')[0]!.toLowerCase()}</p>
          {/* La cifra principal de la app: proporcional (no tabular) y grande. */}
          <p className={`mt-1 text-[2.9rem] font-bold leading-none tracking-tight ${o.available < 0 ? 'text-red' : ''}`}>{money(o.available)}</p>
          <p className="mt-2 text-subhead text-label-2">
            {o.available < 0
              ? 'Este mes sale más de lo que entra.'
              : o.perDay !== null
                ? `Unos ${money(o.perDay)} por día hasta fin de mes (${o.daysLeft} ${o.daysLeft === 1 ? 'día' : 'días'}).`
                : 'No queda margen para gastar este mes.'}
          </p>
          <div className="mt-4 divide-y divide-separator/60 border-t border-separator/60 text-subhead">
            <div className="flex items-baseline justify-between py-2">
              <span>Ingresos</span>
              <span className="tabular text-right">
                {money(o.income.received + o.income.expected)}
                {o.income.expected > 0 && <span className="block text-caption1 text-label-2">{money(o.income.expected)} por cobrar</span>}
              </span>
            </div>
            <div className="flex items-baseline justify-between py-2">
              <span>Gastos</span>
              <span className="tabular text-right">
                − {money(o.spent.done + o.spent.expectedFixed)}
                {o.spent.expectedFixed > 0 && <span className="block text-caption1 text-label-2">incluye {money(o.spent.expectedFixed)} de fijos que faltan</span>}
              </span>
            </div>
            <button type="button" onClick={() => navigate('/tarjetas')} className="flex w-full items-baseline justify-between py-2 text-left active:opacity-60">
              <span>Tarjetas que vencen</span>
              <span className="tabular">− {money(o.cards)}</span>
            </button>
          </div>
          {o.unconvertedUSD && <p className="mt-2 text-footnote text-orange">Hay montos en dólares sin contar: cargá la cotización en Ajustes.</p>}
        </div>
      </section>

      {empty && (
        <section className="px-4 pt-6">
          <div className="card flex flex-col items-center p-6 text-center">
            <Sparkles size={32} className="text-tint" aria-hidden />
            <p className="mt-2 text-headline">Empezá cargando un gasto</p>
            <p className="mt-1 text-subhead text-label-2">Tocá el botón + de abajo. O mirá cómo queda la app con datos de ejemplo.</p>
            <Button variant="secondary" className="mt-4" onClick={() => void loadSampleData()}>
              Cargar datos de ejemplo
            </Button>
          </div>
        </section>
      )}

      {alerts.length > 0 && (
        <Section title="Avisos" {...(alerts.length > 4 ? { action: allAlerts ? 'Ver menos' : `Ver todos (${alerts.length})`, onAction: () => setAllAlerts((v) => !v) } : {})}>
          <div className="card overflow-hidden">
            {visibleAlerts.map((a: Alert, i) => {
              const { Icon, tone, label } = LEVEL_UI[a.level]
              return (
                <Pressable key={a.id} pressScale={1} onClick={() => navigate(alertPath(a.target))} className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-2 ${i === visibleAlerts.length - 1 ? '' : 'border-b border-separator/60'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`} role="img" aria-label={label}>
                    <Icon size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body">{a.title}</p>
                    <p className="text-footnote text-label-2">{a.detail}</p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-label-3" aria-hidden />
                </Pressable>
              )
            })}
          </div>
        </Section>
      )}

      <Section title="Presupuesto del mes" action={dash.budget.rows.length ? 'Ver todo' : 'Configurar'} onAction={() => navigate('/ajustes/presupuestos')}>
        {dash.budget.rows.length === 0 ? (
          <button type="button" onClick={() => navigate('/ajustes/presupuestos')} className="card w-full p-4 text-left text-subhead text-label-2 active:opacity-70">
            Poné un límite mensual por categoría y acá vas a ver cuánto te queda.
          </button>
        ) : (
          <div className="card p-4">
            <div className="flex items-baseline justify-between">
              <p className="tabular text-headline">
                {money(dash.budget.spent)} <span className="text-subhead font-normal text-label-2">de {money(dash.budget.limit)}</span>
              </p>
              <span className="text-subhead text-label-2">{dash.budget.limit ? Math.round((dash.budget.spent / dash.budget.limit) * 100) : 0} %</span>
            </div>
            <ProgressBar value={dash.budget.limit ? dash.budget.spent / dash.budget.limit : 0} tone={{ ok: 'tint', warning: 'orange', over: 'red' }[budgetLevel(dash.budget.spent, dash.budget.limit)] as 'tint' | 'orange' | 'red'} className="mt-2" />
            <ul className="mt-3 space-y-2.5">
              {dash.budget.rows.slice(0, 3).map((r) => (
                <li key={r.categoryId}>
                  <div className="flex items-baseline justify-between text-subhead">
                    <span>{r.category?.icon} {r.category?.name}</span>
                    <span className="tabular text-label-2">{money(r.spent)} / {money(r.limit)}</span>
                  </div>
                  <ProgressBar value={r.pct} tone={{ ok: 'tint', warning: 'orange', over: 'red' }[r.level] as 'tint' | 'orange' | 'red'} className="mt-1" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {dash.goals.length > 0 && (
        <Section title="Metas" action="Ver todas" onAction={() => navigate('/metas')}>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" style={{ overscrollBehaviorX: 'contain' }}>
            {dash.goals.map(({ goal, summary }) => (
              <Pressable key={goal.id} pressScale={0.97} onClick={() => navigate(`/metas/${goal.id}`)} className="card flex w-36 shrink-0 flex-col items-center p-3 text-center">
                <ProgressRing value={summary.pct} size={56} stroke={5} color={goalColor(summary)} label={`${goal.name}: ${Math.round(summary.pct * 100)} %`}>
                  <span className="text-2xl" aria-hidden>{goal.emoji}</span>
                </ProgressRing>
                <p className="mt-2 w-full truncate text-subhead font-semibold">{goal.name}</p>
                <p className="text-footnote text-label-2">{Math.floor(summary.pct * 100)} %</p>
              </Pressable>
            ))}
          </div>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title="Últimos movimientos" action="Ver todos" onAction={() => navigate('/movimientos')}>
          <div className="card overflow-hidden">
            {recent.map((m, i) => (
              <Pressable key={m.key} pressScale={1} onClick={() => navigate(movementOpenPath(m))} className="block w-full text-left active:bg-fill-2">
                <MovementRow movement={m} category={m.categoryId ? categories?.get(m.categoryId) : undefined} privateMode={hide} last={i === recent.length - 1} />
              </Pressable>
            ))}
          </div>
        </Section>
      )}
    </Screen>
  )
}
