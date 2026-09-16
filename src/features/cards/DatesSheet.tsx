import { useEffect, useState } from 'react'
import { FormGroup, FormRow } from '@/components/form/Form'
import { DateField } from '@/components/form/TextField'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { fieldErrors, statementOverrideInputSchema } from '@/core/schemas'
import type { StatementDates } from '@/core/statements'
import type { Period } from '@/core/types'
import { setOverride } from '@/db'

interface Props {
  open: boolean
  onClose: () => void
  cardId: string
  period: Period
  /** Fechas vigentes (con override si lo hay). */
  current: StatementDates
  /** Fechas que saldrían de la regla del día fijo. */
  byRule: StatementDates
  hasOverride: boolean
}

/** Corregir el cierre y vencimiento reales de un resumen (feriados, fines de semana). */
export function DatesSheet({ open, onClose, cardId, period, current, byRule, hasOverride }: Props) {
  const [closingDate, setClosingDate] = useState(current.closingDate)
  const [dueDate, setDueDate] = useState(current.dueDate)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setClosingDate(current.closingDate)
      setDueDate(current.dueDate)
      setErrors({})
    }
  }, [open, current])

  const save = async () => {
    const parsed = statementOverrideInputSchema.safeParse({ closingDate, dueDate })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    await setOverride(cardId, period, parsed.data)
    onClose()
  }
  const reset = async () => {
    await setOverride(cardId, period, {})
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Fechas reales del resumen">
      <div className="-mx-4">
        <FormGroup error={errors.dueDate ?? errors.closingDate} footer={`Por la regla de la tarjeta serían cierre ${byRule.closingDate.split('-').reverse().join('/')} y vencimiento ${byRule.dueDate.split('-').reverse().join('/')}.`}>
          <FormRow label="Cierre">
            <DateField value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
          </FormRow>
          <FormRow label="Vencimiento">
            <DateField value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormRow>
        </FormGroup>
        <div className="flex flex-col gap-3 px-4 pt-5">
          <Button className="w-full" onClick={() => void save()}>
            Guardar fechas
          </Button>
          {hasOverride && (
            <Button variant="secondary" className="w-full" onClick={() => void reset()}>
              Volver a la regla de la tarjeta
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
