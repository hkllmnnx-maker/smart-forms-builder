import type { Context, Next } from 'hono'
import type { AppEnv } from '../types/env'
import { readSessionCookie, clearSessionCookie } from './cookies'
import { findSessionUser } from './db'
import { sha256Hex } from './crypto'
import { rateLimit } from './db'

/** Load user from signed session cookie + D1 session row. */
export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const secret = c.env.SESSION_SECRET
  if (!secret) return next()
  const sid = await readSessionCookie(c, secret)
  if (sid) {
    const user = await findSessionUser(c.env, sid).catch(() => null)
    if (user) {
      c.set('user', { id: user.id, email: user.email, name: user.name, picture: user.picture })
      c.set('sessionId', sid)
    } else {
      // invalid / expired
      clearSessionCookie(c)
    }
  }
  return next()
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  if (!c.get('user')) {
    const accept = c.req.header('accept') || ''
    if (accept.includes('application/json')) {
      return c.json({ error: 'unauthorized', message: 'يجب تسجيل الدخول' }, 401)
    }
    return c.redirect('/login?next=' + encodeURIComponent(c.req.path))
  }
  return next()
}

/** Per-route + per-user/IP rate limit. */
export function makeRateLimiter(opts: { name: string; limit: number; windowSec: number }) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user')
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
    const ipHash = (await sha256Hex(ip)).slice(0, 24)
    const key = `${opts.name}:${user?.id || 'ip:' + ipHash}`

    const r = await rateLimit(c.env, key, opts.limit, opts.windowSec).catch(() => ({ allowed: true, remaining: opts.limit, resetIn: 0 }))
    c.header('X-RateLimit-Limit', String(opts.limit))
    c.header('X-RateLimit-Remaining', String(r.remaining))
    if (!r.allowed) {
      return c.json({ error: 'rate_limited', message: 'تم تجاوز عدد الطلبات. حاول لاحقاً.', resetIn: r.resetIn }, 429)
    }
    return next()
  }
}

/** Strict security headers. */
export async function securityHeaders(c: Context<AppEnv>, next: Next) {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
}
