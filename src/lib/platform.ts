/** Detección de plataforma. Solo para decidir qué pantalla mostrar, nunca para lógica de negocio. */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iDevice = /iPhone|iPad|iPod/.test(ua)
  // iPadOS se presenta como Mac pero con pantalla táctil.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iDevice || iPadOS
}

/** true cuando la app se abrió desde el ícono de la pantalla de inicio. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true
}

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/.test(ua)
}

export function supportsShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] })
  } catch {
    return false
  }
}
