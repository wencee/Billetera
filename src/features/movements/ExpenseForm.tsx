import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { CategoryPicker } from '@/components/CategoryPicker'
import { AmountInput } from '@/components/form/AmountInput'
import { FormGroup, FormRow } from '@/components/form/Form'
import { AccountPicker, DatePicker } from '@/components/form/Pickers'
import { Segmented } from '@/components/form/Segmented'
import { TextField } from '@/components/form/TextField'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { todayISO } from '@/core/dates'
import { expenseInputSchema, fieldErrors } from '@/core/schemas'
import type { Expense } from '@/core/types'
import { createExpense, db, deleteMovement, updateExpense } from '@/db'
import { useAccounts, useCategories } from '@/db/hooks'
import { defaultMethodFor } from '@/lib/labels'
import { useLiveQuery } from 'dexie-react-hooks'

type Method = Expense['method']

/** Alta y edición completa de un gasto sin tarjeta (la carga rápida cubre el caso común). */
export function ExpenseForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = useLiveQuery(() => (id ? db.expenses.get(id) : undefined), [id])
  const accounts = useAccounts()
  const categories = useCategories('expense')
  const [loaded, setLoaded] = useState(!editing)
  const [amount, setAmount] = useState<number | null>(null)
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState<Method>('cash')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existing && !loaded) {
      setAmount(existing.amount)
      setAccountId(existing.accountId)
      setCategoryId(existing.categoryId)
      setDate(existing.date)
      setMethod(existing.method)
      setNote(existing.note ?? '')
      setLoaded(true)
    }
  }, [existing, loaded])

  // Cuenta por defecto: la primera.
  useEffect(() => {
    if (!editing && !accountId && accounts?.[0]) {
      setAccountId(accounts[0].id)
      setMethod(defaultMethodFor(accounts[0].type))
    }
  }, [accounts, accountId, editing])

  const account = accounts?.find((a) => a.id === accountId)

  const save = async () => {
    const parsed = expenseInputSchema.safeParse({ amount: amount ?? 0, currency: account?.currency ?? 'ARS', categoryId, date, method, accountId, note: note || undefined })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (editing && id) await updateExpense(id, parsed.data)
    else await createExpense(parsed.data)
    navigate(-1)
  }

  const remove = async () => {
    if (!id) return
    const undo = await deleteMovement('expense', id)
    navigate(-1)
    if (undo) toast('Gasto borrado', { actionLabel: 'Deshacer', onAction: undo })
  }

  return (
    <Screen
      title={editing ? 'Editar gasto' : 'Nuevo gasto'}
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

      <FormGroup title="Categoría" error={errors.categoryId}>
        <div className="py-2">
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
        </div>
      </FormGroup>

      <FormGroup title="De dónde salió" error={errors.accountId}>
        <div className="py-2">
          <AccountPicker
            accounts={accounts}
            value={accountId}
            onChange={(id) => {
              setAccountId(id)
              const a = accounts?.find((x) => x.id === id)
              if (a) setMethod(defaultMethodFor(a.type))
            }}
          />
        </div>
        <div className="px-4 py-3">
          <Segmented<Method>
            aria-label="Medio de pago"
            value={method}
            onChange={setMethod}
            options={[{ value: 'cash', label: 'Efectivo' }, { value: 'debit', label: 'Débito' }, { value: 'transfer', label: 'Transf.' }, { value: 'wallet', label: 'Billetera' }]}
          />
        </div>
      </FormGroup>

      <FormGroup title="Fecha" error={errors.date}>
        <div className="py-2">
          <DatePicker value={date} onChange={setDate} />
        </div>
      </FormGroup>

      <FormGroup title="Nota" error={errors.note}>
        <FormRow label="Nota">
          <TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Almuerzo, farmacia…" />
        </FormRow>
      </FormGroup>

      <div className="flex flex-col gap-3 px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Agregar gasto'}
        </Button>
        {editing && (
          <Button variant="destructive" className="w-full" onClick={() => void remove()}>
            Borrar gasto
          </Button>
        )}
      </div>
    </Screen>
  )
}
