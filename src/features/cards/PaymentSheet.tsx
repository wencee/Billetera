import { useEffect, useState } from 'react'
import { AmountInput } from '@/components/form/AmountInput'
import { FormGroup, FormRow } from '@/components/form/Form'
import { Segmented } from '@/components/form/Segmented'
import { DateField, NativeSelect } from '@/components/form/TextField'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { todayISO } from '@/core/dates'
import { formatMoney } from '@/core/format'
import { cardPaymentInputSchema, fieldErrors } from '@/core/schemas'
import type { Account, CardPaymentKind, Cents, Period } from '@/core/types'
import { addCardPayment } from '@/db'

interface Props {
  open: boolean
  onClose: () => void
  cardId: string
  period: Period
  /** Total del resumen en ARS con el USD ya convertido (si hay cotización). */
  suggestedTotal: Cents
  accounts: readonly Account[]
}

/** Registrar un pago del resumen: total (marca las cuotas), parcial o mínimo. */
export function PaymentSheet({ open, onClose, cardId, period, suggestedTotal, accounts }: Props) {
  const [kind, setKind] = useState<CardPaymentKind>('total')
  const [amount, setAmount] = useState<Cents | null>(suggestedTotal)
  const [accountId, setAccountId] = useState<string>('')
  const [date, setDate] = useState(todayISO())
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setKind('total')
      setAmount(suggestedTotal)
      setDate(todayISO())
      setErrors({})
      setAccountId((current) => current || accounts[0]?.id || '')
    }
  }, [open, suggestedTotal, accounts])

  const save = async () => {
    const parsed = cardPaymentInputSchema.safeParse({ cardId, period, amount: amount ?? 0, kind, accountId: accountId || undefined, date })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    await addCardPayment(parsed.data)
    onClose()
  }

  const arsAccounts = accounts.filter((a) => a.currency === 'ARS')
  return (
    <Sheet open={open} onClose={onClose} title="Registrar pago">
      <div className="-mx-4">
        <div className="px-4 pt-1">
          <Segmented
            aria-label="Tipo de pago"
            value={kind}
            onChange={(k) => {
              setKind(k)
              if (k === 'total') setAmount(suggestedTotal)
            }}
            options={[{ value: 'total', label: 'Total' }, { value: 'partial', label: 'Parcial' }, { value: 'minimum', label: 'Mínimo' }]}
          />
        </div>
        <FormGroup
          error={errors.amount ?? errors.date}
          footer={kind === 'total' ? `Marca todas las cuotas del resumen como pagadas. Sugerido: ${formatMoney(suggestedTotal)}.` : 'Las cuotas siguen pendientes; el saldo se ve en el resumen.'}
        >
          <FormRow label="Monto pagado" error={errors.amount}>
            <AmountInput value={amount} onChange={setAmount} autoFocus={kind !== 'total'} />
          </FormRow>
          <FormRow label="Fecha">
            <DateField value={date} onChange={(e) => setDate(e.target.value)} />
          </FormRow>
          <FormRow label="Desde la cuenta">
            {arsAccounts.length > 0 ? (
              <NativeSelect value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Sin cuenta</option>
                {arsAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </NativeSelect>
            ) : (
              <span className="text-subhead text-label-2">Las cuentas llegan en la fase 3</span>
            )}
          </FormRow>
        </FormGroup>
        <div className="px-4 pt-5">
          <Button className="w-full" onClick={() => void save()}>
            Guardar pago
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
