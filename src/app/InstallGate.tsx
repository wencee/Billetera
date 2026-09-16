import { useState, type ReactNode } from 'react'
import { isIOS, isStandalone } from '@/lib/platform'
import { InstallScreen } from './InstallScreen'

const DISMISS_KEY = 'billetera:install-dismissed'

/**
 * En iPhone, si la app se abrió en Safari (no instalada), muestra cómo
 * agregarla a la pantalla de inicio. Se puede seguir igual en el navegador.
 */
export function InstallGate({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const shouldPrompt = isIOS() && !isStandalone() && !dismissed
  if (!shouldPrompt) return <>{children}</>
  return (
    <InstallScreen
      onContinue={() => {
        try {
          sessionStorage.setItem(DISMISS_KEY, '1')
        } catch {
          // sin sessionStorage (modo privado estricto) simplemente no se recuerda
        }
        setDismissed(true)
      }}
    />
  )
}
