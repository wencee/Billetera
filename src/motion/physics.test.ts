import { describe, expect, it } from 'vitest'
import { VelocityTracker, nearestSnap, project, rubberband, snapAfterRelease } from './physics'

describe('project', () => {
  it('usa la fórmula de Apple (decaimiento exponencial)', () => {
    expect(project(1000)).toBeCloseTo(499, 0)
    expect(project(1000, 0.99)).toBeCloseTo(99, 0)
    expect(project(-500)).toBeCloseTo(-249.5, 0)
    expect(project(0)).toBe(0)
  })
})

describe('rubberband', () => {
  it('sigue menos cuanto más lejos, sin superar dimension', () => {
    const d = 400
    expect(rubberband(0, d)).toBe(0)
    expect(rubberband(50, d)).toBeLessThan(50)
    expect(rubberband(50, d)).toBeGreaterThan(0)
    expect(rubberband(400, d)).toBeLessThan(rubberband(800, d))
    expect(rubberband(1e9, d)).toBeLessThanOrEqual(d)
  })
  it('conserva el signo', () => {
    expect(rubberband(-50, 400)).toBeCloseTo(-rubberband(50, 400), 9)
  })
})

describe('snap', () => {
  it('nearestSnap', () => {
    expect(nearestSnap(160, [0, 300, 600])).toBe(300)
    expect(nearestSnap(149, [0, 300])).toBe(0)
    expect(nearestSnap(5, [])).toBe(5)
  })
  it('snapAfterRelease usa el impulso, no la posición', () => {
    // A 100px del origen pero yendo rápido hacia 300 → 300
    expect(snapAfterRelease(100, 500, [0, 300, 600])).toBe(300)
    // Casi en 300 pero volviendo rápido → 0
    expect(snapAfterRelease(250, -1200, [0, 300, 600])).toBe(0)
    // Sin velocidad, gana la posición
    expect(snapAfterRelease(250, 0, [0, 300, 600])).toBe(300)
  })
})

describe('VelocityTracker', () => {
  it('estima px/s con las últimas muestras', () => {
    const t = new VelocityTracker(100)
    t.push(0, 0)
    t.push(10, 16)
    t.push(20, 32)
    t.push(30, 48)
    expect(t.velocity(50)).toBeCloseTo(625, 0)
  })
  it('descarta muestras viejas', () => {
    const t = new VelocityTracker(100)
    t.push(0, 0)
    t.push(1000, 500)
    t.push(1010, 520)
    t.push(1020, 540)
    // Solo cuenta desde t=500: 20px en 40ms = 500 px/s
    expect(t.velocity(545)).toBeCloseTo(500, 0)
  })
  it('si el dedo se frenó antes de soltar, la velocidad es 0', () => {
    const t = new VelocityTracker(100)
    t.push(0, 0)
    t.push(100, 50)
    expect(t.velocity(200)).toBe(0)
  })
  it('sin muestras es 0', () => {
    const t = new VelocityTracker()
    expect(t.velocity(0)).toBe(0)
    t.push(5, 0)
    expect(t.velocity(0)).toBe(0)
  })
})
