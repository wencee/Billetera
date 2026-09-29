import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { springs } from '@/motion/springs'

interface Props {
  /** 0-1; se recorta a [0, 1]. */
  value: number
  size?: number
  stroke?: number
  /** Color del trazo (un token de CSS, p. ej. 'var(--color-green)'). */
  color?: string
  children?: ReactNode
  label?: string
}

/**
 * Anillo de progreso. Crece desde su valor anterior con un resorte sin
 * rebote (y aparece directo si está activado "reducir movimiento").
 */
export function ProgressRing({ value, size = 64, stroke = 6, color = 'var(--color-tint)', children, label }: Props) {
  const reduced = useReducedMotion() ?? false
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-fill)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={reduced ? { duration: 0 } : { ...springs.default, duration: 0.8 }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
