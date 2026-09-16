import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FLICK_VELOCITY, springs } from '@/motion/springs'
import { project } from '@/motion/physics'
import { useSheetGesture } from '@/motion/useSheetGesture'
import { Pressable } from './Pressable'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/**
 * Hoja modal que sube desde abajo. Se arrastra para cerrar siguiendo el dedo
 * 1:1; al soltar, la velocidad decide si cierra o vuelve (proyección de
 * impulso), y el resorte hereda esa velocidad para que no haya "costura".
 * Con "reducir movimiento" se reemplaza por un fundido.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <SheetPanel key="sheet" onClose={onClose} {...(title ? { title } : {})}>
          {children}
        </SheetPanel>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function SheetPanel({ onClose, title, children }: Omit<SheetProps, 'open'>) {
  const reduced = useReducedMotion() ?? false
  const y = useMotionValue(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const heightRef = useRef(0)
  const closingRef = useRef(false)
  const [, forceMeasure] = useState(0)

  useLayoutEffect(() => {
    heightRef.current = panelRef.current?.offsetHeight ?? 0
    forceMeasure((n) => n + 1)
  }, [])

  const height = useCallback(() => heightRef.current || window.innerHeight, [])

  // El fondo oscuro se aclara a medida que la hoja baja.
  const scrimOpacity = useTransform(y, (v) => (typeof v === 'number' ? Math.max(0, 1 - v / height()) : 0))

  const dismiss = useCallback(
    (velocity = 0) => {
      if (closingRef.current) return
      closingRef.current = true
      // Con movimiento reducido, o si todavía está entrando (y en '100%'), alcanza con la animación de salida.
      if (reduced || typeof y.get() !== 'number') {
        onClose()
        return
      }
      animate(y, height(), { ...springs.dismiss, velocity }).then(onClose)
    },
    [onClose, reduced, y, height],
  )

  const settle = useCallback(
    (velocity = 0) => {
      animate(y, 0, springs.momentum(velocity))
    },
    [y],
  )

  const onGestureEnd = useCallback(
    (velocity: number) => {
      const offset = y.get()
      const h = height()
      const projected = offset + project(velocity)
      // La velocidad manda: un flick hacia abajo cierra, uno hacia arriba vuelve;
      // si es lento, decide la posición proyectada.
      const shouldDismiss = velocity > FLICK_VELOCITY || (velocity > -300 && projected > h * 0.5)
      if (shouldDismiss) dismiss(velocity)
      else settle(velocity)
    },
    [y, height, dismiss, settle],
  )

  useSheetGesture({ panelRef, contentRef, y, height, onEnd: onGestureEnd })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss])

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div className="absolute inset-0 bg-black/40" style={{ opacity: scrimOpacity }} onClick={() => dismiss()} />
      </motion.div>

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet absolute inset-x-0 bottom-0 z-10"
        style={{ y }}
        initial={reduced ? { opacity: 0 } : { y: '100%' }}
        animate={reduced ? { opacity: 1 } : { y: 0 }}
        exit={reduced ? { opacity: 0 } : { y: '100%' }}
        transition={reduced ? { duration: 0.2 } : springs.sheet}
      >
        <div className="sheet-handle flex flex-col items-center pt-2">
          <div className="h-[5px] w-9 rounded-full bg-label-3" aria-hidden />
          {title && (
            <div className="flex w-full items-center justify-center px-4 py-3">
              <h2 className="text-headline">{title}</h2>
            </div>
          )}
        </div>
        <div ref={contentRef} className="sheet-content flex-1 px-4 pb-4">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

/** Botón "Listo/Cancelar" para usar dentro de una hoja. */
export function SheetAction({ label, onPress, tone = 'primary' }: { label: string; onPress: () => void; tone?: 'primary' | 'plain' }) {
  return (
    <Pressable
      pressScale={0.95}
      onClick={onPress}
      className={`px-3 text-body ${tone === 'primary' ? 'font-semibold text-tint' : 'text-tint'}`}
    >
      {label}
    </Pressable>
  )
}
