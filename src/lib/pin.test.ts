import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin, registerFailure, verifyPin } from './pin'

describe('PIN', () => {
  it('solo acepta de 4 a 6 números', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })

  it('guarda un hash con sal y lo verifica', async () => {
    const { hash, salt } = await hashPin('2580')
    expect(hash).not.toContain('2580')
    expect(await verifyPin('2580', hash, salt)).toBe(true)
    expect(await verifyPin('2581', hash, salt)).toBe(false)
    expect(await verifyPin('abc', hash, salt)).toBe(false)
  })

  it('el mismo PIN da hashes distintos (sal aleatoria)', async () => {
    const a = await hashPin('1111')
    const b = await hashPin('1111')
    expect(a.hash).not.toBe(b.hash)
    expect(a.salt).not.toBe(b.salt)
  })

  it('rechaza un PIN inválido al crearlo', async () => {
    await expect(hashPin('12')).rejects.toThrow()
  })

  it('espera creciente después de 5 errores', () => {
    let a = { failures: 0, lockedUntil: 0 }
    for (let i = 0; i < 4; i++) a = registerFailure(a, 1000)
    expect(a).toEqual({ failures: 4, lockedUntil: 0 })
    a = registerFailure(a, 1000)
    expect(a).toEqual({ failures: 5, lockedUntil: 31000 })
    a = registerFailure(a, 1000)
    expect(a.lockedUntil).toBe(61000)
    for (let i = 0; i < 10; i++) a = registerFailure(a, 1000)
    expect(a.lockedUntil).toBe(1000 + 15 * 60_000)
  })
})
