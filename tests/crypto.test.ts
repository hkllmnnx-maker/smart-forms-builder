import { describe, it, expect } from 'vitest'
import { signValue, unsignValue, encryptString, decryptString, randomToken } from '../src/lib/crypto'

const SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('signed cookie values', () => {
  it('round-trips a signed value', async () => {
    const signed = await signValue(SECRET, 'session-id-xyz')
    const out = await unsignValue(SECRET, signed)
    expect(out).toBe('session-id-xyz')
  })

  it('rejects tampered signatures', async () => {
    const signed = await signValue(SECRET, 'abc')
    const tampered = signed.replace(/.$/, 'X')
    const out = await unsignValue(SECRET, tampered)
    expect(out).toBeNull()
  })

  it('rejects different secret', async () => {
    const signed = await signValue(SECRET, 'abc')
    const out = await unsignValue('ff'.repeat(32), signed)
    expect(out).toBeNull()
  })
})

describe('AES-GCM token encryption', () => {
  it('encrypts and decrypts arbitrary text', async () => {
    const plain = 'refresh-token-12345'
    const cipher = await encryptString(SECRET, plain)
    expect(cipher).not.toBe(plain)
    const back = await decryptString(SECRET, cipher)
    expect(back).toBe(plain)
  })

  it('returns null for tampered ciphertext', async () => {
    const cipher = await encryptString(SECRET, 'hello')
    const bad = cipher.slice(0, -2) + 'AA'
    const back = await decryptString(SECRET, bad)
    expect(back).toBeNull()
  })

  it('produces different ciphertexts for the same plaintext', async () => {
    const a = await encryptString(SECRET, 'same')
    const b = await encryptString(SECRET, 'same')
    expect(a).not.toBe(b)
  })
})

describe('randomToken', () => {
  it('produces unique tokens', () => {
    const a = randomToken(16)
    const b = randomToken(16)
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(10)
  })
})
