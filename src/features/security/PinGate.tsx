import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSettings } from '@/db/hooks'
import { LockScreen } from './LockScreen'

/** Si la app vuelve después de más de esto en segundo plano, pide el PIN de nuevo. */
const RELOCK_AFTER_MS = 60_000

/**
 * Candado de la app. Con PIN configurado: bloquea al abrir y al volver de
 * segundo plano después de 1 minuto. Además, apenas la app pasa a segundo
 * plano tapa el contenido, así la captura del selector de apps no muestra montos.
 */
export function PinGate({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const hasPin = Boolean(settings?.pinHash && settings.pinSalt)
  // null = todavía no se leyeron los ajustes. Se decide una sola vez al abrir:
  // configurar un PIN con la app abierta no la bloquea en el acto.
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [covered, setCovered] = useState(false)
  const hiddenAt = useRef<number | null>(null)

  useEffect(() => {
    if (settings && unlocked === null) setUnlocked(!hasPin)
  }, [settings, hasPin, unlocked])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
        if (hasPin) setCovered(true)
      } else {
        if (hasPin && hiddenAt.current !== null && Date.now() - hiddenAt.current > RELOCK_AFTER_MS) setUnlocked(false)
        hiddenAt.current = null
        setCovered(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [hasPin])

  if (!settings || unlocked === null) return null
  if (hasPin && !unlocked) {
    return <LockScreen pinHash={settings.pinHash!} pinSalt={settings.pinSalt!} pinLength={settings.pinLength} onUnlock={() => setUnlocked(true)} />
  }
  return (
    <>
      {children}
      {covered && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg" aria-hidden>
          <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#3a8dff] to-[#5e5ce6] text-3xl">👛</span>
        </div>
      )}
    </>
  )
}
