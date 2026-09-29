/**
 * PIN de bloqueo. Nunca se guarda el PIN: se guarda un hash PBKDF2-SHA256 con
 * sal aleatoria. Aclaración honesta: con 4 a 6 dígitos esto frena a alguien
 * que agarra el teléfono desbloqueado, no a un atacante con acceso a los
 * archivos (los datos en IndexedDB no están cifrados).
 */

export const PIN_MIN = 4
export const PIN_MAX = 6
const ITERATIONS = 310_000

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin)
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function derive(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS }, key, 256)
  return new Uint8Array(bits)
}

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  if (!isValidPin(pin)) throw new Error('El PIN tiene que tener de 4 a 6 números')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { hash: toBase64(await derive(pin, salt)), salt: toBase64(salt) }
}

/** Compara en tiempo constante para no filtrar cuántos bytes coinciden. */
export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  if (!isValidPin(pin)) return false
  const a = await derive(pin, fromBase64(salt))
  const b = fromBase64(hash)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

// ---------- Intentos fallidos ----------

export interface Attempts {
  failures: number
  /** Timestamp (ms) hasta el que no se puede probar de nuevo. */
  lockedUntil: number
}

/** Después de 5 errores, espera de 30 s que se duplica en cada error siguiente (tope 15 min). */
export function registerFailure(prev: Attempts, now: number): Attempts {
  const failures = prev.failures + 1
  if (failures < 5) return { failures, lockedUntil: 0 }
  const wait = Math.min(15 * 60_000, 30_000 * 2 ** (failures - 5))
  return { failures, lockedUntil: now + wait }
}
