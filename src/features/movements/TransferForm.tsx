import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { FormGroup, FormRow } from '@/components/form/Form'
import { AccountPicker, DatePicker } from '@/components/form/Pickers'
import { TextField } from '@/components/form/TextField'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { todayISO } from '@/core/dates'
import { formatMoney } from '@/core/format'
import { fieldErrors, transferInputSchema } from '@/core/schemas'
import { createTransfer, db, deleteMovement, updateTransfer } from '@/db'
import { useAccounts } from '@/db/hooks'

/** Mover plata entre cuentas propias; si las monedas difieren (comprar dólares), se cargan los dos montos. */
export function TransferForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = useLiveQuery(() => (id ? db.transfers.get(id) : undefined), [id])
  const accounts = useAccounts()
  const [loaded, setLoaded] = useState(!editing)
  const [fromAccountId, setFrom] = useState('')
  const [toAccountId, setTo] = useState('')
  const [fromAmount, setFromAmount] = useState<number | null>(null)
  const [toAmount, setToAmount] = useState<number | null>(null)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existing && !loaded) {
      setFrom(existing.fromAccountId)
      setTo(existing.toAccountId)
      setFromAmount(existing.fromAmount)
      setToAmount(existing.toAmount)
      setDate(existing.date)
      setNote(existing.note ?? '')
      setLoaded(true)
    }
  }, [existing, loaded])

  useEffect(() => {
    if (!editing && accounts && accounts.length >= 2 && !fromAccountId && !toAccountId) {
      setFrom((accounts.find((a) => a.type === 'bank') ?? accounts[0])!.id)
      setTo(accounts.find((a) => a.type === 'cash')?.id ?? accounts[1]!.id)
    }
  }, [accounts, editing, fromAccountId, toAccountId])

  const from = accounts?.find((a) => a.id === fromAccountId)
  const to = accounts?.find((a) => a.id === toAccountId)
  const crossCurrency = Boolean(from && to && from.currency !== to.currency)
  const rate =
    crossCurrency && fromAmount && toAmount
      ? from!.currency === 'ARS' ? Math.round((fromAmount * 100) / toAmount) : Math.round((toAmount * 100) / fromAmount)
      : null

  const save = async () => {
    const parsed = transferInputSchema.safeParse({
      fromAccountId, toAccountId, fromAmount: fromAmount ?? 0, toAmount: crossCurrency ? (toAmount ?? 0) : (fromAmount ?? 0), date, note: note || undefined,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (editing && id) await updateTransfer(id, parsed.data)
    else await createTransfer(parsed.data)
    navigate(-1)
  }

  const remove = async () => {
    if (!id) return
    const undo = await deleteMovement('transfer', id)
    navigate(-1)
    if (undo) toast('Transferencia borrada', { actionLabel: 'Deshacer', onAction: undo })
  }

  return (
    <Screen
      title={editing ? 'Editar transferencia' : 'Transferencia'}
      back="Movimientos"
      backTo="/movimientos"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      {accounts && accounts.length < 2 && (
        <p className="px-8 pt-6 text-center text-subhead text-label-2">Necesitás al menos dos cuentas. Agregalas en Ajustes → Cuentas.</p>
      )}
      <FormGroup title="Sale de" error={errors.fromAccountId}>
        <div className="py-2">
          <AccountPicker aria-label="Cuenta de origen" accounts={accounts} value={fromAccountId} onChange={setFrom} />
        </div>
        <FormRow label="Monto" error={errors.fromAmount}>
          <AmountInput value={fromAmount} onChange={setFromAmount} currency={from?.currency ?? 'ARS'} autoFocus={!editing} />
        </FormRow>
      </FormGroup>

      <FormGroup title="Entra en" error={errors.toAccountId ?? errors.toAmount} footer={rate ? `Cotización implícita: ${formatMoney(rate)} por dólar` : undefined}>
        <div className="py-2">
          <AccountPicker aria-label="Cuenta de destino" accounts={accounts?.filter((a) => a.id !== fromAccountId)} value={toAccountId} onChange={setTo} />
        </div>
        {crossCurrency && (
          <FormRow label="Recibís" error={errors.toAmount}>
            <AmountInput value={toAmount} onChange={setToAmount} currency={to?.currency ?? 'ARS'} />
          </FormRow>
        )}
      </FormGroup>

      <FormGroup title="Fecha">
        <div className="py-2">
          <DatePicker value={date} onChange={setDate} />
        </div>
      </FormGroup>

      <FormGroup title="Nota">
        <FormRow label="Nota">
          <TextField value={note} onChange={(e) => setNote(e.target.value)} placeholder="Extracción, compra de dólares…" />
        </FormRow>
      </FormGroup>

      <div className="flex flex-col gap-3 px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Transferir'}
        </Button>
        {editing && (
          <Button variant="destructive" className="w-full" onClick={() => void remove()}>
            Borrar transferencia
          </Button>
        )}
      </div>
    </Screen>
  )
}
