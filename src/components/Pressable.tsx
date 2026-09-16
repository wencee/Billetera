import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef } from 'react'
import { springs } from '@/motion/springs'

type Props = HTMLMotionProps<'button'> & {
  /** Escala al presionar. 0.97 para botones grandes, 0.92 para íconos. */
  pressScale?: number
}

/**
 * Botón con respuesta inmediata al tocar (pointer-down, no al soltar),
 * área táctil mínima de 44px y sin selección de texto.
 */
export const Pressable = forwardRef<HTMLButtonElement, Props>(function Pressable(
  { pressScale = 0.97, className = '', children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={{ scale: pressScale }}
      transition={springs.press}
      className={`min-h-11 min-w-11 select-none ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
})

type ButtonProps = Props & { variant?: 'primary' | 'secondary' | 'destructive' | 'plain' }

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-tint text-white font-semibold',
  secondary: 'bg-fill text-tint font-semibold',
  destructive: 'bg-fill text-red font-semibold',
  plain: 'text-tint',
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <Pressable
      className={`flex items-center justify-center rounded-xl px-5 py-3 text-body ${variants[variant]} ${className}`}
      {...rest}
    />
  )
}
