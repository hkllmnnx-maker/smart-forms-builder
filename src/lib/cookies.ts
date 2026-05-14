import type { Context } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { signValue, unsignValue } from './crypto'

const SESSION_COOKIE = 'sfb_session'
const STATE_COOKIE = 'sfb_oauth_state'

export async function setSessionCookie(c: Context<any>, sessionId: string, secret: string) {
  const signed = await signValue(secret, sessionId)
  setCookie(c, SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })
}

export async function readSessionCookie(c: Context<any>, secret: string): Promise<string | null> {
  const raw = getCookie(c, SESSION_COOKIE)
  if (!raw) return null
  return unsignValue(secret, raw)
}

export function clearSessionCookie(c: Context<any>) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

export function setOAuthStateCookie(c: Context<any>, state: string) {
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 10
  })
}

export function readOAuthStateCookie(c: Context<any>): string | undefined {
  return getCookie(c, STATE_COOKIE)
}

export function clearOAuthStateCookie(c: Context<any>) {
  deleteCookie(c, STATE_COOKIE, { path: '/' })
}
