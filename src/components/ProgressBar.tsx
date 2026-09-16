import { motion } from 'motion/react'
import { springs } from '@/motion/springs'

interface Props {
  /** 0-1; se recorta a [0, 1] para el ancho. */
  value: number
  tone?: 'tint' | 'green' | 'orange' | 'red' | 'white'
  className?: string
}

const tones = { tint: 'bg-tint', green: 'bg-green', orange: 'bg-orange', red: 'bg-red', white: 'bg-white' }

export function ProgressBar({ value, tone = 'tint', className = '' }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-fill ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={`h-full rounded-full ${tones[tone]}`} initial={false} animate={{ width: `${pct}%` }} transition={springs.default} />
    </div>
  )
}
