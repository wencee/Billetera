import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { FormGroup, FormRow } from '@/components/form/Form'
import { Segmented } from '@/components/form/Segmented'
import { TextField } from '@/components/form/TextField'
import { Toggle } from '@/components/form/Toggle'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { accountInputSchema, fieldErrors } from '@/core/schemas'
import type { AccountType, Currency } from '@/core/types'
import { accountUsage, createAccount, db, deleteAccount, updateAccount } from '@/db'

export function AccountForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = useLiveQuery(() => (id ? db.accounts.get(id) : undefined), [id])
  const usage = useLiveQuery(() => (id ? accountUsage(id) : Promise.resolve(0)), [id])
  const [loaded, setLoaded] = useState(!editing)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [initialBalance, setInitialBalance] = useState<number | null>(null)
  const [archived, setArchived] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name)
      setType(existing.type)
      setCurrency(existing.currency)
      setInitialBalance(existing.initialBalance)
      setArchived(existing.archived)
      setLoaded(true)
    }
  }, [existing, loaded])

  const currencyLocked = editing && (usage ?? 0) > 0

  const save = async () => {
    const parsed = accountInputSchema.safeParse({ name, type, currency, initialBalance: initialBalance ?? 0 })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (editing && id) await updateAccount(id, { ...parsed.data, archived })
    else await createAccount(parsed.data)
    navigate(-1)
  }

  const remove = async () => {
    if (!id) return
    const result = await deleteAccount(id)
    toast(result === 'deleted' ? 'Cuenta eliminada' : 'La cuenta tiene movimientos: quedó archivada')
    navigate(-1)
  }

  return (
    <Screen
      title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
      back="Cuentas"
      backTo="/ajustes/cuentas"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      <FormGroup title="Cuenta" error={errors.name}>
        <FormRow label="Nombre" error={errors.name}>
          <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Mercado Pago" autoFocus={!editing} />
        </FormRow>
        <div className="px-4 py-3">
          <Segmented<AccountType> aria-label="Tipo" value={type} onChange={setType} options={[{ value: 'cash', label: 'Efectivo' }, { value: 'bank', label: 'Banco' }, { value: 'wallet', label: 'Billetera' }]} />
        </div>
      </FormGroup>

      <FormGroup title="Moneda" footer={currencyLocked ? 'No se puede cambiar la moneda de una cuenta con movimientos.' : undefined}>
        <div className={`px-4 py-3 ${currencyLocked ? 'pointer-events-none opacity-50' : ''}`}>
          <Segmented<Currency> aria-label="Moneda" value={currency} onChange={setCurrency} options={[{ value: 'ARS', label: 'Pesos' }, { value: 'USD', label: 'Dólares' }]} />
        </div>
      </FormGroup>

      <FormGroup title="Saldo inicial" footer="Lo que había en la cuenta antes de empezar a usar la app. El saldo actual se calcula solo.">
        <FormRow label="Saldo inicial" error={errors.initialBalance}>
          <AmountInput value={initialBalance} onChange={setInitialBalance} currency={currency} />
        </FormRow>
      </FormGroup>

      {editing && (
        <FormGroup footer="Una cuenta archivada no aparece al cargar gastos, pero conserva su historial.">
          <FormRow label="Archivada">
            <Toggle checked={archived} onChange={setArchived} aria-label="Archivada" />
          </FormRow>
        </FormGroup>
      )}

      <div className="flex flex-col gap-3 px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Agregar cuenta'}
        </Button>
        {editing && (
          <Button variant="destructive" className="w-full" onClick={() => void remove()}>
            {(usage ?? 0) > 0 ? 'Archivar cuenta' : 'Eliminar cuenta'}
          </Button>
        )}
      </div>
    </Screen>
  )
}
