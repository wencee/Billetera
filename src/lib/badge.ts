/**
 * Número en el ícono de la app (Badging API). En iPhone funciona solo con la
 * app instalada en la pantalla de inicio y con permiso de notificaciones
 * (iOS lo exige aunque la app nunca mande una notificación).
 */

type BadgeNavigator = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function badgeSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as BadgeNavigator).setAppBadge === 'function'
}

/** Pide el permiso si hace falta. Devuelve true si se puede mostrar el número. */
export async function enableBadge(): Promise<boolean> {
  if (!badgeSupported()) return false
  if (typeof Notification === 'undefined') return true
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export async function setBadge(count: number): Promise<void> {
  const nav = navigator as BadgeNavigator
  try {
    if (count > 0) await nav.setAppBadge?.(count)
    else await nav.clearAppBadge?.()
  } catch {
    // Sin permiso o no soportado: el número simplemente no aparece.
  }
}
