import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { ListGroup, ListRow } from '@/components/List'
import { ProgressRing } from '@/components/ProgressRing'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { SwipeRow } from '@/components/SwipeRow'
import { periodOf, todayISO } from '@/core/dates'
import { formatDate, formatDateShort, formatMoney, formatPeriodLong } from '@/core/format'
import { summarizeGoal } from '@/core/goals'
import { db, deleteGoalEntry, setGoalArchived } from '@/db'
import { useAccountBalances, useAccounts, useGoalEntries, useSettings } from '@/db/hooks'
import { springs } from '@/motion/springs'
import { EntrySheet } from './EntrySheet'
import { goalColor, goalHint } from './goalText'

export function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goal = useLiveQuery(() => (id ? db.goals.get(id) : undefined), [id])
  const entries = useGoalEntries(id)
  const accounts = useAccounts(true)
  const balances = useAccountBalances()
  const settings = useSettings()
  const reduced = useReducedMotion() ?? false
  const [mode, setMode] = useState<'deposit' | 'withdraw' | null>(null)
  const [celebrate, setCelebrate] = useState(0)
  const hide = settings?.privateMode ?? false
  const today = todayISO()

  const s = useMemo(() => (goal && entries ? summarizeGoal(goal, entries, today) : null), [goal, entries, today])
  if (!goal || !entries || !s) return <Screen title="Meta" back="Metas" backTo="/metas" compact>{null}</Screen>

  const money = (c: number) => formatMoney(c, goal.currency, { hide })
  const money0 = (c: number) => formatMoney(c, goal.currency, { hide, fractionDigits: 0 })
  const accountName = (accId?: string) => (accId ? (accounts?.find((a) => a.id === accId)?.name ?? 'Cuenta borrada') : 'Solo registro')

  const removeEntry = async (entryId: string) => {
    const undo = await deleteGoalEntry(entryId)
    if (undo) toast('Movimiento de la meta borrado', { actionLabel: 'Deshacer', onAction: undo })
  }

  return (
    <Screen
      title={goal.name}
      back="Metas"
      backTo="/metas"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body text-tint" onClick={() => navigate(`/metas/${goal.id}/editar`)}>
          Editar
        </Pressable>
      }
    >
      <div className="flex flex-col items-center px-4 pt-6 text-center">
        {/* Al cumplir la meta, el anillo "late" una vez con un resorte con impulso. Nada de confeti. */}
        <motion.div key={celebrate} initial={celebrate > 0 && !reduced ? { scale: 0.9 } : false} animate={{ scale: 1 }} transition={springs.momentum(900)}>
          <ProgressRing value={s.pct} size={168} stroke={12} color={goalColor(s)} label={`${Math.round(s.pct * 100)} % de la meta`}>
            <div className="flex flex-col items-center">
              <span className="text-4xl" aria-hidden>{goal.emoji}</span>
              <span className="tabular text-title2">{Math.floor(s.pct * 100)} %</span>
            </div>
          </ProgressRing>
        </motion.div>
        <h2 className="mt-4 text-title2">{goal.name}</h2>
        <p className="tabular text-body text-label-2">
          {money0(s.saved)} de {money0(goal.targetAmount)}
        </p>
        <p className={`mt-1 text-subhead ${s.status === 'done' ? 'font-semibold text-green' : s.status === 'behind' || s.status === 'overdue' ? 'text-orange' : 'text-label-2'}`}>
          {goalHint(s, goal.currency, hide)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-5">
        <Button onClick={() => setMode('deposit')}>
          <ArrowDownLeft size={18} className="mr-1.5" aria-hidden />
          Aportar
        </Button>
        <Button variant="secondary" onClick={() => setMode('withdraw')} disabled={s.saved <= 0}>
          <ArrowUpRight size={18} className="mr-1.5" aria-hidden />
          Retirar
        </Button>
      </div>

      <ListGroup title="Resumen">
        <ListRow label="Falta" value={money0(s.remaining)} />
        {goal.targetDate && (
          <ListRow label="Fecha objetivo" value={`${formatDate(goal.targetDate)}${s.daysLeft !== null && s.daysLeft >= 0 ? ` · ${s.daysLeft} días` : ''}`} />
        )}
        {s.suggestion && !s.suggestion.overdue && <ListRow label="Aporte sugerido" value={`${money0(s.suggestion.monthly)} / mes`} />}
        <ListRow label="Tu ritmo (últimos 3 meses)" value={s.pace > 0 ? `${money0(s.pace)} / mes` : 'sin aportes'} />
        <ListRow label="A este ritmo llegás en" value={s.status === 'done' ? 'ya llegaste' : s.projected ? formatPeriodLong(periodOf(s.projected)) : '—'} last />
      </ListGroup>

      <ListGroup title={`Historial (${entries.length})`} footer={entries.length ? 'Deslizá un movimiento para borrarlo.' : undefined}>
        {entries.length === 0 && <p className="px-4 py-6 text-center text-subhead text-label-2">Todavía no hay aportes. Empezá con lo que puedas.</p>}
        {entries.map((e, i) => (
          <SwipeRow key={e.id} rowKey={`goal-entry:${e.id}`} onDelete={() => void removeEntry(e.id)}>
            <div className={`flex min-h-[56px] items-center gap-3 px-4 py-2.5 ${i === entries.length - 1 ? '' : 'border-b border-separator/60'}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${e.amount >= 0 ? 'bg-green/15 text-green' : 'bg-orange/15 text-orange'}`} aria-hidden>
                {e.amount >= 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body">{e.amount >= 0 ? 'Aporte' : 'Retiro'}{e.note ? ` · ${e.note}` : ''}</p>
                <p className="text-footnote text-label-2">{formatDateShort(e.date)} · {accountName(e.accountId)}</p>
              </div>
              <span className={`tabular text-body font-semibold ${e.amount >= 0 ? 'text-green' : ''}`}>
                {e.amount >= 0 ? '+' : '−'}
                {money(Math.abs(e.amount))}
              </span>
            </div>
          </SwipeRow>
        ))}
      </ListGroup>

      {s.status === 'done' && !goal.archived && (
        <div className="px-4 pt-6">
          <Button variant="secondary" className="w-full" onClick={() => void setGoalArchived(goal.id, true)}>
            Archivar meta cumplida
          </Button>
        </div>
      )}

      <EntrySheet
        goal={goal}
        mode={mode}
        saved={s.saved}
        accounts={accounts?.filter((a) => !a.archived) ?? []}
        balances={balances}
        onClose={() => setMode(null)}
        onCompleted={() => setCelebrate((n) => n + 1)}
      />
    </Screen>
  )
}
