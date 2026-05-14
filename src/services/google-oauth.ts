/**
 * Google OAuth 2.0 flow + token refresh.
 * Pure fetch calls - no Node deps - works inside Cloudflare Workers.
 */

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  // Only Forms-related scopes. We DO NOT request Drive or full account access.
  'https://www.googleapis.com/auth/forms.body'
]

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  id_token?: string
}

export interface GoogleUserInfo {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
  locale?: string
}

export function buildAuthUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  loginHint?: string
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: opts.state
  })
  if (opts.loginHint) params.set('login_hint', opts.loginHint)
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(opts: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: 'authorization_code'
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(`Token exchange failed: ${res.status} ${err?.error || ''} ${err?.error_description || ''}`)
  }
  return (await res.json()) as GoogleTokens
}

export async function refreshAccessToken(opts: {
  refreshToken: string
  clientId: string
  clientSecret: string
}): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    grant_type: 'refresh_token'
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  if (!res.ok) {
    const err = await safeJson(res)
    throw new Error(`Refresh failed: ${res.status} ${err?.error || ''}`)
  }
  return (await res.json()) as GoogleTokens
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) throw new Error(`UserInfo failed: ${res.status}`)
  return (await res.json()) as GoogleUserInfo
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }).catch(() => undefined)
}

async function safeJson(res: Response): Promise<any> {
  try { return await res.json() } catch { return null }
}
