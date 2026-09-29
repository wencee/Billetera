import { useEffect, useRef, useState } from 'react'
import { toast } from '@/app/toast'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { updateSettings } from '@/db'
import { useSettings } from '@/db/hooks'
import { hashPin, isValidPin, PIN_MAX, PIN_MIN, verifyPin } from '@/lib/pin'
import { PinPad, type PinPadHandle } from './PinPad'

export type PinFlow = 'create' | 'change' | 'remove'

type Step = 'current' | 'new' | 'confirm'

const TITLE: Record<Step, string> = {
  current: 'Ingresá tu PIN actual',
  new: 'Elegí un PIN',
  confirm: 'Repetilo',
}

/** Crear, cambiar o quitar el PIN. Cambiar y quitar piden el actual primero. */
export function PinSetupSheet({ flow, onClose }: { flow: PinFlow | null; onClose: () => void }) {
  const settings = useSettings()
  const [step, setStep] = useState<Step>('new')
  const [value, setValue] = useState('')
  const [first, setFirst] = useState('')
  const [error, setError] = useState('')
  const pad = useRef<PinPadHandle>(null)

  useEffect(() => {
    if (!flow) return
    setStep(flow === 'create' ? 'new' : 'current')
    setValue('')
    setFirst('')
    setError('')
  }, [flow])

  const fail = (message: string) => {
    setError(message)
    setValue('')
    pad.current?.shake()
  }

  const submit = async (pin: string) => {
    if (step === 'current') {
      const ok = settings?.pinHash && settings.pinSalt ? await verifyPin(pin, settings.pinHash, settings.pinSalt) : false
      if (!ok) return fail('PIN incorrecto')
      if (flow === 'remove') {
        await updateSettings({ pinHash: undefined, pinSalt: undefined, pinLength: undefined })
        toast('Se quitó el PIN')
        onClose()
        return
      }
      setStep('new')
      setValue('')
      setError('')
    } else if (step === 'new') {
      if (!isValidPin(pin)) return fail(`Tiene que tener de ${PIN_MIN} a ${PIN_MAX} números`)
      setFirst(pin)
      setStep('confirm')
      setValue('')
      setError('')
    } else {
      if (pin !== first) {
        setStep('new')
        setFirst('')
        return fail('No coinciden. Probá de nuevo.')
      }
      const { hash, salt } = await hashPin(pin)
      await updateSettings({ pinHash: hash, pinSalt: salt, pinLength: pin.length })
      toast(flow === 'change' ? 'PIN cambiado' : 'PIN activado')
      onClose()
    }
  }

  // El actual y la confirmación tienen largo conocido: se validan solos al completarse.
  const knownLength = step === 'current' ? settings?.pinLength : step === 'confirm' ? first.length : undefined
  const onChange = (v: string) => {
    setValue(v)
    if (knownLength ? v.length === knownLength : step === 'new' && v.length === PIN_MAX) void submit(v)
  }

  return (
    <Sheet
      open={flow !== null}
      onClose={onClose}
      title={flow === 'remove' ? 'Quitar el PIN' : flow === 'change' ? 'Cambiar el PIN' : 'Bloqueo con PIN'}
      footer={
        step === 'new' || (step === 'current' && !knownLength) ? (
          <Button className="w-full" disabled={value.length < PIN_MIN} onClick={() => void submit(value)}>
            Continuar
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center pb-2">
        <p className="text-headline">{TITLE[step]}</p>
        <p className="mt-1 h-5 text-subhead text-label-2" aria-live="polite">
          {error || (step === 'new' ? `De ${PIN_MIN} a ${PIN_MAX} números` : '')}
        </p>
        <div className="mt-6">
          <PinPad ref={pad} value={value} onChange={onChange} {...(knownLength ? { length: knownLength } : {})} />
        </div>
      </div>
    </Sheet>
  )
}
