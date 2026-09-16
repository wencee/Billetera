import type { MotionValue } from 'motion/react'
import { useEffect, useRef, type RefObject } from 'react'
import { VelocityTracker, rubberband } from './physics'

interface Options {
  panelRef: RefObject<HTMLElement | null>
  /** Zona con scroll propio dentro de la hoja. Solo arrastra si está al tope y el dedo va hacia abajo. */
  contentRef: RefObject<HTMLElement | null>
  y: MotionValue<number>
  height: () => number
  onEnd: (velocity: number) => void
  enabled?: boolean
}

const HYSTERESIS = 6

/**
 * Arrastre vertical de una hoja modal.
 * - Sigue al dedo 1:1 hacia abajo; hacia arriba aplica resistencia elástica.
 * - Dentro del contenido con scroll, solo toma el gesto si está al tope y va hacia abajo;
 *   si no, deja scrollear.
 * - Usa touch events nativos (no pasivos) para poder cancelar el scroll de iOS,
 *   y pointer events solo para el mouse (desarrollo en PC).
 */
export function useSheetGesture({ panelRef, contentRef, y, height, onEnd, enabled = true }: Options): void {
  // Los callbacks viven en refs: un re-render a mitad del gesto no reinicia los listeners.
  const heightRef = useRef(height)
  const onEndRef = useRef(onEnd)
  heightRef.current = height
  onEndRef.current = onEnd

  useEffect(() => {
    const el = panelRef.current
    if (!el || !enabled) return

    const tracker = new VelocityTracker(100)
    let tracking = false
    let decided = false
    let active = false
    let startY = 0

    const contentAtTop = () => (contentRef.current?.scrollTop ?? 0) <= 0
    const inContent = (target: EventTarget | null) => !!contentRef.current && contentRef.current.contains(target as Node)

    const begin = (clientY: number) => {
      tracking = true
      decided = false
      active = false
      startY = clientY
      tracker.reset()
      tracker.push(clientY)
    }

    const move = (clientY: number, target: EventTarget | null, preventDefault: () => void) => {
      if (!tracking) return
      if (!decided) {
        const dy = clientY - startY
        if (Math.abs(dy) < HYSTERESIS) return
        decided = true
        if (inContent(target) && (dy < 0 || !contentAtTop())) {
          tracking = false // es scroll del contenido, no nuestro
          return
        }
        active = true
        startY = clientY // re-base: la hoja arranca desde donde se decidió
        tracker.reset()
      }
      if (!active) return
      preventDefault()
      const dy = clientY - startY
      y.set(dy >= 0 ? dy : rubberband(dy, heightRef.current()))
      tracker.push(clientY)
    }

    const end = () => {
      if (!tracking) return
      tracking = false
      if (!active) return
      active = false
      onEndRef.current(tracker.velocity())
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      begin(e.touches[0]!.clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      move(e.touches[0]!.clientY, e.target, () => {
        if (e.cancelable) e.preventDefault()
      })
    }
    const onTouchEnd = () => end()

    // Mouse (desarrollo en PC): pointer events, ignorando los que vienen de touch.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      begin(e.clientY)
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp, { once: true })
    }
    const onPointerMove = (e: PointerEvent) => {
      move(e.clientY, e.target, () => e.preventDefault())
    }
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      end()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    el.addEventListener('pointerdown', onPointerDown)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [panelRef, contentRef, y, enabled])
}
