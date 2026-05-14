/**
 * Web Crypto helpers used for:
 *  - signed session cookies (HMAC-SHA256)
 *  - encrypting Google refresh tokens at rest (AES-GCM)
 *
 * SESSION_SECRET must be a hex string >= 32 bytes (use openssl rand -hex 32).
 */

const enc = new TextEncoder()
const dec = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '')
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return out
}

async function deriveKey(secret: string, info: string, length = 32): Promise<Uint8Array> {
  // Derive a sub-key from SESSION_SECRET using HKDF-like construction with SHA-256.
  // Avoids importing extra libs.
  const secretBytes = secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)
    ? hexToBytes(secret)
    : enc.encode(secret)

  const baseKey = await crypto.subtle.importKey(
    'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', baseKey, enc.encode(info))
  return new Uint8Array(sig).slice(0, length)
}

export async function hmacSign(secret: string, data: string): Promise<string> {
  const keyBytes = secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)
    ? hexToBytes(secret)
    : enc.encode(secret)
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return toBase64Url(new Uint8Array(sig))
}

export async function hmacVerify(secret: string, data: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(secret, data)
  // constant-time-ish compare
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

/** Sign cookie value `v.signature` */
export async function signValue(secret: string, value: string): Promise<string> {
  const sig = await hmacSign(secret, value)
  return `${value}.${sig}`
}

export async function unsignValue(secret: string, signed: string): Promise<string | null> {
  const idx = signed.lastIndexOf('.')
  if (idx === -1) return null
  const value = signed.slice(0, idx)
  const sig = signed.slice(idx + 1)
  return (await hmacVerify(secret, value, sig)) ? value : null
}

/** Encrypt arbitrary string with AES-GCM using a key derived from secret. */
export async function encryptString(secret: string, plaintext: string): Promise<string> {
  const keyBytes = await deriveKey(secret, 'token-encryption-v1', 32)
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  )
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv, 0)
  out.set(ct, iv.length)
  return toBase64Url(out)
}

export async function decryptString(secret: string, payload: string): Promise<string | null> {
  try {
    const keyBytes = await deriveKey(secret, 'token-encryption-v1', 32)
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt'])
    const raw = fromBase64Url(payload)
    const iv = raw.slice(0, 12)
    const ct = raw.slice(12)
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return dec.decode(pt)
  } catch {
    return null
  }
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return toBase64Url(arr)
}

export async function sha256Hex(input: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(input))
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
