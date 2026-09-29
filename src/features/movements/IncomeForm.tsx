import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { Chips } from '@/components/form/Chips'
import { FormGroup, FormRow } from '@/components/form/Form'
import { AccountPicker, DatePicker } from '@/components/form/Pickers'
import { TextField } from '@/components/form/TextField'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { todayISO } from '@/core/dates'
import { fieldErrors, incomeInputSchema } from '@/core/schemas'
import { createIncome, db, deleteMovement, updateIncome } from '@/db'
import { useAccounts, useCategories } from '@/db/hooks'

export function IncomeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = useLiveQuery(() => (id ? db.incomes.get(id) : undefined), [id])
  const accounts = useAccounts()
  const sources = useCategories('income')
  const [loaded, setLoaded] = useState(!editing)
  const [amount, setAmount] = useState<number | null>(null)
  const [accountId, setAccountId] = useState('')
  const [source, setSource] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existing && !loaded) {
      setAmount(existing.amount)
      setAccountId(existing.accountId)
      setSource(existing.source)
      setDate(existing.date)
      setNote(existing.note ?? '')
      setLoaded(true)
    }
  }, [existing, loaded])

  useEffect(() => {
    if (!editing && !accountId && accounts?.length) {
      // Por defecto, la primera cuenta bancaria (donde suele caer el sueldo).
      setAccountId((accounts.find((a) => a.type === 'bank') ?? accounts[0])!.id)
    }
  }, [accounts, accountId, editing])

  const account = accounts?.find((a) => a.id === accountId)

  const save = async () => {
    const parsed = incomeInputSchema.safeParse({ amount: amount ?? 0, currency: account?.currency ?? 'ARS', date, source, accountId, note: note || undefined })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (editing && id) await updateIncome(id, parsed.data)
    else await createIncome(parsed.data)
    navigate(-1)
  }

  const remove = async () => {
    if (!id) return
    const undo = await deleteMovement('income', id)
    navigate(-1)
    if (undo) toast('Ingreso borrado', { actionLabel: 'Deshacer', onAction: undo })
  }

  return (
    <Screen
      title={editing ? 'Editar ingreso' : 'Nuevo ingreso'}
      back="Movimientos"
      backTo="/movimientos"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      <div className="px-4 pt-6 pb-2">
        <AmountInput size="hero" value={amount} onChange={setAmount} currency={account?.currency ?? 'ARS'} autoFocus={!editing} />
        {errors.amount && <p className="mt-2 text-center text-footnote text-red">{errors.amount}</p>}
      </div>

      <FormGroup title="De dónde viene" error={errors.source}>
        <div className="py-2">
          <Chips aria-label="Fuente" value={source} onChange={setSource} options={(sources ?? []).map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` }))} />
        </div>
        <FormRow label="Otra">
          <TextField value={source} onChange={(e) => setSource(e.target.value)} placeholder="Venta de la bici" />
        </FormRow>
      </FormGroup>

      <FormGroup title="A qué cuenta entra" error={errors.accountId}>
        <div className="py-2">
          <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
        </div>
      </FormGroup>

      <FormGroup title="Fecha" error={errors.date}>
        <div className="py-2">
          <DatePicker value={date} onChange={setDate} />
        </div>
      </FormGroup>

      <FormGroup title="Nota">
        <FormRow label="Nota">
          <TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </FormRow>
      </FormGroup>

      <div className="flex flex-col gap-3 px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Agregar ingreso'}
        </Button>
        {editing && (
          <Button variant="destructive" className="w-full" onClick={() => void remove()}>
            Borrar ingreso
          </Button>
        )}
      </div>
    </Screen>
  )
}
