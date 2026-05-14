import { Hono } from 'hono'
import type { AppEnv } from '../types/env'
import { buildAuthUrl, exchangeCodeForTokens, fetchUserInfo, revokeToken } from '../services/google-oauth'
import { encryptString, randomToken } from '../lib/crypto'
import { setSessionCookie, clearSessionCookie, setOAuthStateCookie, readOAuthStateCookie, clearOAuthStateCookie } from '../lib/cookies'
import { upsertUser, createSession, deleteSession, saveOAuthState, consumeOAuthState, findUser } from '../lib/db'
import { decryptString } from '../lib/crypto'

const auth = new Hono<AppEnv>()

/** Start OAuth flow */
auth.get('/login', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
    return c.html(renderConfigError(), 500)
  }
  const state = randomToken(24)
  const redirectTo = c.req.query('next') || '/dashboard'
  await saveOAuthState(c.env, state, redirectTo)
  setOAuthStateCookie(c, state)

  const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${getOrigin(c)}/api/auth/callback`
  const url = buildAuthUrl({
    clientId: c.env.GOOGLE_CLIENT_ID,
    redirectUri,
    state
  })
  return c.redirect(url)
})

/** OAuth callback */
auth.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const errorParam = c.req.query('error')
  if (errorParam) return c.redirect(`/error?reason=${encodeURIComponent('تم رفض الإذن: ' + errorParam)}`)
  if (!code || !state) return c.redirect('/error?reason=' + encodeURIComponent('بيانات OAuth ناقصة'))

  // Verify state in DB + cookie
  const cookieState = readOAuthStateCookie(c)
  if (!cookieState || cookieState !== state) return c.redirect('/error?reason=' + encodeURIComponent('state غير مطابق - منع CSRF'))
  const stateRow = await consumeOAuthState(c.env, state)
  if (!stateRow) return c.redirect('/error?reason=' + encodeURIComponent('state منتهي الصلاحية'))
  clearOAuthStateCookie(c)

  try {
    const redirectUri = c.env.GOOGLE_REDIRECT_URI || `${getOrigin(c)}/api/auth/callback`
    const tokens = await exchangeCodeForTokens({
      code,
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    })
    const userInfo = await fetchUserInfo(tokens.access_token)

    // encrypt refresh token (may be missing on subsequent consents -> keep existing if so)
    let encRefresh: string | null = null
    if (tokens.refresh_token) {
      encRefresh = await encryptString(c.env.SESSION_SECRET, tokens.refresh_token)
    }

    await upsertUser(c.env, {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || null,
      picture: userInfo.picture || null,
      refresh_token: encRefresh,
      scopes: tokens.scope
    })

    const sid = randomToken(32)
    await createSession(c.env, sid, userInfo.sub)
    await setSessionCookie(c, sid, c.env.SESSION_SECRET)

    const dest = stateRow.redirect_to || '/dashboard'
    return c.redirect(dest)
  } catch (e: any) {
    console.error('OAuth callback error:', e.message)
    return c.redirect('/error?reason=' + encodeURIComponent('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.'))
  }
})

/** Logout */
auth.post('/logout', async (c) => {
  const sid = c.get('sessionId')
  if (sid) await deleteSession(c.env, sid).catch(() => undefined)
  clearSessionCookie(c)
  return c.json({ ok: true })
})

auth.get('/logout', async (c) => {
  const sid = c.get('sessionId')
  if (sid) await deleteSession(c.env, sid).catch(() => undefined)
  clearSessionCookie(c)
  return c.redirect('/')
})

/** Revoke + delete account */
auth.post('/revoke', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'unauthorized' }, 401)
  const row = await findUser(c.env, user.id)
  if (row?.refresh_token) {
    const refresh = await decryptString(c.env.SESSION_SECRET, row.refresh_token)
    if (refresh) await revokeToken(refresh)
  }
  const sid = c.get('sessionId')
  if (sid) await deleteSession(c.env, sid).catch(() => undefined)
  clearSessionCookie(c)
  return c.json({ ok: true })
})

/** Current user info */
auth.get('/me', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ authenticated: false })
  return c.json({ authenticated: true, user })
})

function getOrigin(c: any): string {
  const url = new URL(c.req.url)
  return `${url.protocol}//${url.host}`
}

function renderConfigError(): string {
  return `<!doctype html><html dir="rtl" lang="ar"><body style="font-family:sans-serif;padding:24px;max-width:680px;margin:auto;background:#0b0b0f;color:#e7e7ea">
  <h2>إعداد OAuth غير مكتمل</h2>
  <p>يجب تعيين <code>GOOGLE_CLIENT_ID</code> و <code>GOOGLE_CLIENT_SECRET</code> في .dev.vars (محلياً) أو عبر wrangler secrets في الإنتاج.</p>
  <p>راجع README.md للحصول على تعليمات إعداد Google Cloud Console.</p>
  <a style="color:#a78bfa" href="/">العودة للرئيسية</a>
  </body></html>`
}

export default auth
