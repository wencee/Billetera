/**
 * Física de gestos, traducida de "Designing Fluid Interfaces" (WWDC 2018).
 * Funciones puras: sin DOM, sin React.
 */

/**
 * Proyecta hasta dónde llegaría un objeto que se suelta a `velocity` px/s con
 * desaceleración exponencial (la misma curva que el scroll de iOS).
 * decelerationRate 0.998 = scroll normal; 0.99 = frena más rápido.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/**
 * Resistencia elástica al pasarse de un borde: cuanto más lejos, menos sigue
 * al dedo. `dimension` es el tamaño del contenedor en ese eje.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (overshoot === 0 || dimension <= 0) return 0
  const sign = overshoot < 0 ? -1 : 1
  const abs = Math.abs(overshoot)
  return sign * ((abs * dimension * constant) / (dimension + constant * abs))
}

/** Punto de snap más cercano a `value`. */
export function nearestSnap(value: number, snapPoints: readonly number[]): number {
  if (snapPoints.length === 0) return value
  let best = snapPoints[0]!
  let bestDist = Math.abs(value - best)
  for (const p of snapPoints) {
    const d = Math.abs(value - p)
    if (d < bestDist) {
      best = p
      bestDist = d
    }
  }
  return best
}

/**
 * Elige el punto de snap al que ir después de soltar: proyecta el impulso y
 * toma el más cercano al punto proyectado, no al punto de suelta.
 */
export function snapAfterRelease(current: number, velocity: number, snapPoints: readonly number[], decelerationRate = 0.998): number {
  return nearestSnap(current + project(velocity, decelerationRate), snapPoints)
}

/**
 * Registra posiciones con su tiempo y estima la velocidad (px/s) al soltar
 * usando solo las últimas muestras, como hacen los recognizers de UIKit.
 */
export class VelocityTracker {
  private samples: { t: number; v: number }[] = []
  constructor(private readonly windowMs = 100) {}

  reset(): void {
    this.samples = []
  }

  push(value: number, time: number = performance.now()): void {
    this.samples.push({ t: time, v: value })
    const cutoff = time - this.windowMs
    while (this.samples.length > 2 && (this.samples[0]?.t ?? 0) < cutoff) this.samples.shift()
  }

  /** Velocidad en px/s. Si el dedo se quedó quieto antes de soltar, es 0. */
  velocity(now: number = performance.now()): number {
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    if (!first || !last || first === last) return 0
    if (now - last.t > 50) return 0
    const dt = last.t - first.t
    if (dt <= 0) return 0
    return ((last.v - first.v) / dt) * 1000
  }
}
