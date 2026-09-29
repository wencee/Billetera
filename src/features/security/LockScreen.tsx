import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { clearAllData } from '@/db'
import { registerFailure, verifyPin, type Attempts } from '@/lib/pin'
import { PinPad, type PinPadHandle } from './PinPad'

const ATTEMPTS_KEY = 'billetera:pin-attempts'

function loadAttempts(): Attempts {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    return raw ? (JSON.parse(raw) as Attempts) : { failures: 0, lockedUntil: 0 }
  } catch {
    return { failures: 0, lockedUntil: 0 }
  }
}

function saveAttempts(a: Attempts): void {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(a))
  } catch {
    // sin localStorage no se limita, pero el PIN sigue funcionando
  }
}

interface Props {
  pinHash: string
  pinSalt: string
  pinLength: number | undefined
  onUnlock: () => void
}

/** Pantalla de bloqueo: se valida apenas se completa el largo del PIN. */
export function LockScreen({ pinHash, pinSalt, pinLength, onUnlock }: Props) {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [attempts, setAttempts] = useState<Attempts>(loadAttempts)
  const [now, setNow] = useState(Date.now())
  const [forgot, setForgot] = useState(false)
  const pad = useRef<PinPadHandle>(null)
  const waiting = attempts.lockedUntil > now

  useEffect(() => {
    if (!waiting) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [waiting])

  const check = async (pin: string) => {
    setChecking(true)
    const ok = await verifyPin(pin, pinHash, pinSalt)
    setChecking(false)
    if (ok) {
      const reset = { failures: 0, lockedUntil: 0 }
      saveAttempts(reset)
      onUnlock()
      return
    }
    const next = registerFailure(attempts, Date.now())
    saveAttempts(next)
    setAttempts(next)
    setNow(Date.now())
    pad.current?.shake()
    setValue('')
  }

  const onChange = (v: string) => {
    if (checking || waiting) return
    setValue(v)
    if (pinLength ? v.length === pinLength : v.length === 6) void check(v)
  }

  const seconds = Math.ceil((attempts.lockedUntil - now) / 1000)
  return (
    <div className="flex h-full flex-col items-center bg-bg px-6" style={{ paddingTop: 'calc(var(--safe-top) + 3rem)', paddingBottom: 'calc(var(--safe-bottom) + 1.5rem)' }}>
      <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#3a8dff] to-[#5e5ce6] text-3xl shadow-lg" aria-hidden>
        👛
      </span>
      <h1 className="mt-4 text-title3">Ingresá tu PIN</h1>
      <p className="mt-1 h-5 text-subhead text-label-2" aria-live="polite">
        {waiting ? `Demasiados intentos. Esperá ${seconds} s.` : attempts.failures > 0 ? 'PIN incorrecto' : ''}
      </p>
      <div className="mt-8">
        <PinPad ref={pad} value={value} onChange={onChange} {...(pinLength ? { length: pinLength } : {})} disabled={waiting || checking} />
      </div>
      {!pinLength && value.length >= 4 && (
        <Button className="mt-6" onClick={() => void check(value)} disabled={checking || waiting}>
          Desbloquear
        </Button>
      )}
      <button type="button" onClick={() => setForgot(true)} className="mt-auto min-h-11 text-subhead text-tint active:opacity-60">
        Olvidé el PIN
      </button>

      <Sheet open={forgot} onClose={() => setForgot(false)} title="¿Olvidaste el PIN?">
        <p className="text-body text-label-2">
          Como tus datos están solo en este teléfono, no hay forma de recuperar el PIN. Lo único que se puede hacer es borrar todo y, si tenés un backup, importarlo después desde Ajustes → Backup y datos.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="destructive"
            onClick={async () => {
              await clearAllData()
              saveAttempts({ failures: 0, lockedUntil: 0 })
              setForgot(false)
              onUnlock()
            }}
          >
            Borrar todos los datos
          </Button>
          <Button variant="secondary" onClick={() => setForgot(false)}>
            Probar de nuevo
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
