import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { snapAfterRelease } from '@/motion/physics'
import { springs } from '@/motion/springs'
import { useHorizontalPan } from '@/motion/useHorizontalPan'

interface Props {
  index: number
  onIndexChange: (index: number) => void
  children: ReactNode
  /** Cuánto se ve de las tarjetas vecinas, en px. */
  peek?: number
  gap?: number
  className?: string
}

/**
 * Carrusel con snap: sigue el dedo 1:1, al soltar proyecta el impulso y va a
 * la tarjeta más cercana al punto proyectado, heredando la velocidad.
 * Un flick fuerte rebota apenas; un arrastre lento asienta sin rebote.
 */
export function Carousel({ index, onIndexChange, children, peek = 24, gap = 12, className = '' }: Props) {
  const slides = Children.toArray(children)
  const count = slides.length
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const reduced = useReducedMotion() ?? false
  const [width, setWidth] = useState(0)
  const dragging = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const step = Math.max(1, width - peek * 2 + gap)
  const targetFor = useCallback((i: number) => -i * step, [step])
  const bounds = useCallback(() => ({ min: targetFor(count - 1), max: 0 }), [targetFor, count])

  // Ir al índice pedido (cambio externo o después de agregar/quitar tarjetas).
  const first = useRef(true)
  useEffect(() => {
    if (width === 0 || dragging.current) return
    const target = targetFor(Math.min(index, Math.max(0, count - 1)))
    if (first.current || reduced) {
      x.set(target)
      first.current = false
    } else {
      animate(x, target, springs.default)
    }
  }, [index, width, count, targetFor, x, reduced])

  useHorizontalPan({
    ref,
    x,
    bounds,
    onStart: () => {
      dragging.current = true
    },
    onEnd: (velocity) => {
      dragging.current = false
      // Paginado: proyecta el impulso pero avanza como máximo una tarjeta por gesto (como UIScrollView con paging).
      const targets = [index - 1, index, index + 1].filter((i) => i >= 0 && i < count).map(targetFor)
      const target = snapAfterRelease(x.get(), velocity, targets)
      const next = Math.round(-target / step)
      animate(x, target, springs.momentum(velocity))
      if (next !== index) onIndexChange(next)
    },
  })

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ touchAction: 'pan-y' }}
      role="region"
      aria-roledescription="carrusel"
    >
      <motion.div className="flex will-change-transform" style={{ x, gap, paddingLeft: peek, paddingRight: peek }}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className="shrink-0"
            style={{ width: Math.max(0, width - peek * 2) }}
            aria-hidden={i !== index}
            onClickCapture={(e) => {
              // Tocar una tarjeta vecina la trae al frente en lugar de activar lo que tenga adentro.
              if (i !== index) {
                e.stopPropagation()
                e.preventDefault()
                onIndexChange(i)
              }
            }}
          >
            {slide}
          </div>
        ))}
      </motion.div>
      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${i === index ? 'bg-label' : 'bg-label-3'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
