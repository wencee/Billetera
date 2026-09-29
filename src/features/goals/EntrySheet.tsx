import { useEffect, useState } from 'react'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { Chips } from '@/components/form/Chips'
import { DatePicker } from '@/components/form/Pickers'
import { TextField } from '@/components/form/TextField'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { todayISO } from '@/core/dates'
import { formatMoney } from '@/core/format'
import { fieldErrors, goalEntryInputSchema } from '@/core/schemas'
import type { Account, Cents, Goal } from '@/core/types'
import { addGoalEntry, deleteGoalEntry } from '@/db'
import { useSettings } from '@/db/hooks'
import { ACCOUNT_TYPE_ICON } from '@/lib/labels'

const NO_ACCOUNT = 'none'

interface Props {
  goal: Goal
  mode: 'deposit' | 'withdraw' | null
  saved: Cents
  accounts: readonly Account[]
  balances: ReadonlyMap<string, Cents> | undefined
  onClose: () => void
  /** Se llama si con este aporte la meta queda cumplida. */
  onCompleted?: () => void
}

/** Aportar a una meta (sale de una cuenta) o retirar (vuelve a una cuenta). Sin cuenta = solo registro. */
export function EntrySheet({ goal, mode, saved, accounts, balances, onClose, onCompleted }: Props) {
  const withdraw = mode === 'withdraw'
  const hide = useSettings()?.privateMode ?? false
  const eligible = accounts.filter((a) => a.currency === goal.currency)
  const [amount, setAmount] = useState<Cents | null>(null)
  const [accountId, setAccountId] = useState(NO_ACCOUNT)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!mode) return
    setAmount(null)
    setDate(todayISO())
    setNote('')
    setError('')
    // Por defecto, la cuenta con más saldo en la moneda de la meta (solo al abrir, no en cada cambio de saldo).
    const best = [...eligible].sort((a, b) => (balances?.get(b.id) ?? 0) - (balances?.get(a.id) ?? 0))[0]
    setAccountId(best?.id ?? NO_ACCOUNT)
  }, [mode])

  const save = async () => {
    if (withdraw && amount !== null && amount > saved) {
      setError(`No podés retirar más de lo ahorrado (${formatMoney(saved, goal.currency)})`)
      return
    }
    const parsed = goalEntryInputSchema.safeParse({
      goalId: goal.id, amount: withdraw ? -(amount ?? 0) : (amount ?? 0), date,
      accountId: accountId === NO_ACCOUNT ? undefined : accountId, note: note || undefined,
    })
    if (!parsed.success || !amount || amount <= 0) {
      setError(parsed.success ? 'Poné un monto' : (Object.values(fieldErrors(parsed.error))[0] ?? 'Revisá los datos'))
      return
    }
    const entry = await addGoalEntry(parsed.data)
    onClose()
    const completed = !withdraw && saved < goal.targetAmount && saved + amount >= goal.targetAmount
    if (completed) onCompleted?.()
    toast(completed ? `¡Meta cumplida! ${goal.emoji}` : withdraw ? 'Retiro registrado' : `Aporte de ${formatMoney(amount, goal.currency)} registrado`, {
      actionLabel: 'Deshacer',
      onAction: () => deleteGoalEntry(entry.id),
    })
  }

  const balance = accountId !== NO_ACCOUNT ? balances?.get(accountId) : undefined
  return (
    <Sheet
      open={mode !== null}
      onClose={onClose}
      title={withdraw ? `Retirar de ${goal.name}` : `Aportar a ${goal.name}`}
      footer={
        <Button className="w-full" onClick={() => void save()}>
          {withdraw ? 'Retirar' : 'Aportar'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <AmountInput size="hero" value={amount} onChange={setAmount} currency={goal.currency} autoFocus />
          {error && <p className="mt-2 text-center text-footnote text-red">{error}</p>}
          {withdraw && <p className="mt-1 text-center text-footnote text-label-2">Ahorrado: {formatMoney(saved, goal.currency, { hide })}</p>}
        </div>
        <div>
          <p className="pb-1 text-footnote uppercase text-label-2">{withdraw ? 'Vuelve a' : 'Sale de'}</p>
          <div className="-mx-4">
            <Chips
              aria-label="Cuenta"
              value={accountId}
              onChange={setAccountId}
              options={[...eligible.map((a) => ({ value: a.id, label: `${ACCOUNT_TYPE_ICON[a.type]} ${a.name}` })), { value: NO_ACCOUNT, label: 'Solo registro' }]}
            />
          </div>
          <p className="pt-1 text-footnote text-label-2">
            {accountId === NO_ACCOUNT
              ? 'No mueve plata de ninguna cuenta: sirve para anotar lo que ya tenías guardado.'
              : balance !== undefined ? `Saldo de la cuenta: ${formatMoney(balance, goal.currency, { hide })}` : ''}
          </p>
        </div>
        <div className="-mx-4">
          <DatePicker value={date} onChange={setDate} />
        </div>
        <label className="card flex min-h-12 items-center px-4">
          <TextField align="left" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" />
        </label>
      </div>
    </Sheet>
  )
}
