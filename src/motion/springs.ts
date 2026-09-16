import type { Transition } from 'motion/react'

/**
 * Presets de resortes, mapeados de los valores que usa Apple
 * (damping ratio → `bounce = 1 − damping`, response → `duration`).
 * Regla de la casa: sin rebote salvo que un gesto con impulso lo justifique.
 */
export const springs = {
  /** UI en general: críticamente amortiguado (damping 1.0, response 0.35). */
  default: { type: 'spring', bounce: 0, duration: 0.35 } satisfies Transition,
  /** Respuesta al toque: rápido y seco. */
  press: { type: 'spring', bounce: 0, duration: 0.15 } satisfies Transition,
  /** Hoja que sube/baja sin gesto previo. */
  sheet: { type: 'spring', bounce: 0, duration: 0.35 } satisfies Transition,
  /** Cierre de hoja. */
  dismiss: { type: 'spring', bounce: 0, duration: 0.3 } satisfies Transition,
  /** Después de soltar con impulso: damping 0.8 (bounce 0.2), response 0.3. */
  momentum(velocity: number): Transition {
    return { type: 'spring', bounce: Math.abs(velocity) > 600 ? 0.2 : 0, duration: 0.3, velocity }
  },
} as const

/** Velocidad (px/s) a partir de la cual un gesto cuenta como "flick". */
export const FLICK_VELOCITY = 800
