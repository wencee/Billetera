import { Delete } from 'lucide-react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { PIN_MAX } from '@/lib/pin'

export interface PinPadHandle {
  /** Sacude los puntos (PIN incorrecto). Con "reducir movimiento" solo parpadea. */
  shake: () => void
}

interface Props {
  value: string
  onChange: (value: string) => void
  /** Cuántos puntos mostrar (el largo del PIN si se conoce; si no, 6 máximo). */
  length?: number
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const
const LETTERS: Record<string, string> = { '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ' }

/** Teclado de código como el del iPhone: respuesta al apoyar el dedo, no al soltar. */
export const PinPad = forwardRef<PinPadHandle, Props>(function PinPad({ value, onChange, length, disabled }, ref) {
  const controls = useAnimationControls()
  const reduced = useReducedMotion() ?? false
  useImperativeHandle(ref, () => ({
    shake: () => {
      void controls.start(
        reduced
          ? { opacity: [1, 0.3, 1], transition: { duration: 0.3 } }
          : { x: [0, -14, 12, -8, 5, 0], transition: { duration: 0.45, ease: 'easeOut' } },
      )
    },
  }))

  // Teclado físico (útil en la PC).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return
      if (/^\d$/.test(e.key) && value.length < PIN_MAX) onChange(value + e.key)
      else if (e.key === 'Backspace') onChange(value.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onChange, disabled])

  const dots = length ?? Math.max(4, value.length)
  const press = (k: (typeof KEYS)[number]) => {
    if (disabled) return
    if (k === 'del') onChange(value.slice(0, -1))
    else if (k && value.length < PIN_MAX) onChange(value + k)
  }

  return (
    <div className="flex flex-col items-center">
      <motion.div animate={controls} className="flex h-6 items-center gap-4" role="status" aria-label={`${value.length} de ${dots} números`}>
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 border-label transition-colors duration-100 ${i < value.length ? 'bg-label' : 'bg-transparent'}`} />
        ))}
      </motion.div>
      <div className="mt-10 grid grid-cols-3 gap-x-6 gap-y-4">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              aria-label={k === 'del' ? 'Borrar' : k}
              onPointerDown={(e) => {
                e.preventDefault()
                press(k)
              }}
              onClick={(e) => {
                // Teclado/lector de pantalla: el click sin pointerdown previo.
                if (e.detail === 0) press(k)
              }}
              className={`flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full transition-colors duration-75 disabled:opacity-40 ${
                k === 'del' ? 'text-label active:opacity-50' : 'bg-fill text-label active:bg-label-3'
              }`}
            >
              {k === 'del' ? (
                <Delete size={26} aria-hidden />
              ) : (
                <>
                  <span className="text-[2rem] font-normal leading-none">{k}</span>
                  {LETTERS[k] && <span className="mt-0.5 text-[0.6rem] font-semibold tracking-[0.15em] text-label-2">{LETTERS[k]}</span>}
                </>
              )}
            </button>
          ),
        )}
      </div>
    </div>
  )
})
