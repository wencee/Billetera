import { motion } from 'motion/react'
import { springs } from '@/motion/springs'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  'aria-label'?: string
}

/** Switch estilo iOS. Cambia al tocar (pointer-down) y el knob se mueve con resorte. */
export function Toggle({ checked, onChange, ...aria }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria['aria-label']}
      onPointerDown={(e) => {
        e.preventDefault()
        onChange(!checked)
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-green' : 'bg-fill'}`}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]"
        animate={{ x: checked ? 20 : 0 }}
        transition={springs.default}
      />
    </button>
  )
}
