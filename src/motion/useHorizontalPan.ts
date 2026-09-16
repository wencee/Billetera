import type { MotionValue } from 'motion/react'
import { useEffect, useRef, type RefObject } from 'react'
import { VelocityTracker, rubberband } from './physics'

interface Options {
  ref: RefObject<HTMLElement | null>
  x: MotionValue<number>
  /** Rango válido de x (min ≤ max); fuera de él se aplica resistencia elástica. */
  bounds: () => { min: number; max: number }
  onEnd: (velocity: number) => void
  onStart?: () => void
}

const HYSTERESIS = 6

/**
 * Arrastre horizontal 1:1 (carruseles, filas deslizables). Usa Pointer Events
 * con `touch-action: pan-y` en el elemento: iOS se queda con los gestos
 * verticales (scroll) y nos entrega los horizontales. Decide la dirección con
 * una histéresis de 6px y captura el puntero para seguir aunque salga del área.
 */
export function useHorizontalPan({ ref, x, bounds, onEnd, onStart }: Options): void {
  const boundsRef = useRef(bounds)
  const onEndRef = useRef(onEnd)
  const onStartRef = useRef(onStart)
  boundsRef.current = bounds
  onEndRef.current = onEnd
  onStartRef.current = onStart

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tracker = new VelocityTracker(100)
    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let originX = 0
    let decided: 'h' | 'v' | null = null

    const applyBounds = (value: number) => {
      const { min, max } = boundsRef.current()
      const span = Math.max(1, el.clientWidth)
      if (value > max) return max + rubberband(value - max, span)
      if (value < min) return min + rubberband(value - min, span)
      return value
    }

    const finish = (cancelled: boolean) => {
      if (pointerId === null) return
      const wasHorizontal = decided === 'h'
      pointerId = null
      decided = null
      if (wasHorizontal) onEndRef.current(cancelled ? 0 : tracker.velocity())
    }

    const onDown = (e: PointerEvent) => {
      if (pointerId !== null || (e.pointerType === 'mouse' && e.button !== 0)) return
      pointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      originX = x.get()
      decided = null
      tracker.reset()
      tracker.push(e.clientX)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!decided) {
        if (Math.abs(dx) < HYSTERESIS && Math.abs(dy) < HYSTERESIS) return
        if (Math.abs(dy) > Math.abs(dx)) {
          decided = 'v'
          return
        }
        decided = 'h'
        el.setPointerCapture(e.pointerId)
        onStartRef.current?.()
        tracker.reset()
      }
      if (decided !== 'h') return
      x.set(applyBounds(originX + dx))
      tracker.push(e.clientX)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      finish(false)
    }
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      finish(true)
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    el.addEventListener('lostpointercapture', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      el.removeEventListener('lostpointercapture', onCancel)
    }
  }, [ref, x])
}
