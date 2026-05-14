/**
 * Fetch a fresh Google access token for a given user using their stored
 * encrypted refresh token. Access tokens themselves are never persisted.
 */
import type { Bindings } from '../types/env'
import { decryptString } from './crypto'
import { findUser } from './db'
import { refreshAccessToken } from '../services/google-oauth'

export async function getAccessTokenForUser(env: Bindings, userId: string): Promise<string> {
  const user = await findUser(env, userId)
  if (!user) throw new Error('User not found')
  if (!user.refresh_token) throw new Error('No refresh token. Please re-authorize Google.')

  const refresh = await decryptString(env.SESSION_SECRET, user.refresh_token)
  if (!refresh) throw new Error('Failed to decrypt token. Please re-authorize.')

  const tokens = await refreshAccessToken({
    refreshToken: refresh,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET
  })

  return tokens.access_token
}
