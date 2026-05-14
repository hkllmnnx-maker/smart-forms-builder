import type { Bindings } from '../types/env'

export interface UserRow {
  id: string
  email: string
  name: string | null
  picture: string | null
  refresh_token: string | null
  scopes: string | null
  created_at: string
  updated_at: string
}

export interface SessionRow {
  id: string
  user_id: string
  created_at: string
  expires_at: string
}

export interface FormRow {
  id: number
  user_id: string
  google_form_id: string | null
  title: string | null
  description: string | null
  responder_url: string | null
  edit_url: string | null
  question_count: number
  status: 'pending' | 'success' | 'failed'
  error_message: string | null
  source_kind: 'text' | 'docx' | null
  created_at: string
}

export async function upsertUser(
  env: Bindings,
  user: { id: string; email: string; name?: string | null; picture?: string | null; refresh_token?: string | null; scopes?: string | null }
) {
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, picture, refresh_token, scopes, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = COALESCE(excluded.name, users.name),
       picture = COALESCE(excluded.picture, users.picture),
       refresh_token = COALESCE(excluded.refresh_token, users.refresh_token),
       scopes = COALESCE(excluded.scopes, users.scopes),
       updated_at = CURRENT_TIMESTAMP`
  )
    .bind(user.id, user.email, user.name ?? null, user.picture ?? null, user.refresh_token ?? null, user.scopes ?? null)
    .run()
}

export async function findUser(env: Bindings, id: string): Promise<UserRow | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(id).first<UserRow>()
  return row || null
}

export async function createSession(env: Bindings, sessionId: string, userId: string, days = 30) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)`
  ).bind(sessionId, userId, expires).run()
}

export async function findSessionUser(env: Bindings, sessionId: string): Promise<UserRow | null> {
  const row = await env.DB.prepare(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?1 AND s.expires_at > CURRENT_TIMESTAMP`
  ).bind(sessionId).first<UserRow>()
  return row || null
}

export async function deleteSession(env: Bindings, sessionId: string) {
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(sessionId).run()
}

export async function saveOAuthState(env: Bindings, state: string, redirectTo: string | null, minutes = 10) {
  const exp = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  await env.DB.prepare(
    `INSERT INTO oauth_states (state, expires_at, redirect_to) VALUES (?1, ?2, ?3)`
  ).bind(state, exp, redirectTo).run()
}

export async function consumeOAuthState(env: Bindings, state: string): Promise<{ redirect_to: string | null } | null> {
  const row = await env.DB.prepare(
    `SELECT redirect_to FROM oauth_states WHERE state = ?1 AND expires_at > CURRENT_TIMESTAMP`
  ).bind(state).first<{ redirect_to: string | null }>()
  if (!row) return null
  await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?1').bind(state).run()
  return row
}

export async function logForm(env: Bindings, data: Partial<FormRow> & { user_id: string }): Promise<number> {
  const res = await env.DB.prepare(
    `INSERT INTO generated_forms
       (user_id, google_form_id, title, description, responder_url, edit_url, question_count, status, error_message, source_kind)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  ).bind(
    data.user_id,
    data.google_form_id ?? null,
    data.title ?? null,
    data.description ?? null,
    data.responder_url ?? null,
    data.edit_url ?? null,
    data.question_count ?? 0,
    data.status ?? 'pending',
    data.error_message ?? null,
    data.source_kind ?? null
  ).run()
  return Number(res.meta.last_row_id)
}

export async function listForms(env: Bindings, userId: string, limit = 50): Promise<FormRow[]> {
  const r = await env.DB.prepare(
    `SELECT * FROM generated_forms WHERE user_id = ?1 ORDER BY created_at DESC LIMIT ?2`
  ).bind(userId, limit).all<FormRow>()
  return r.results || []
}

/** Lightweight rate limiter using D1. Returns true if allowed. */
export async function rateLimit(env: Bindings, key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const now = Date.now()
  const windowMs = windowSec * 1000

  const row = await env.DB.prepare(
    'SELECT count, window_started FROM rate_limits WHERE key = ?1'
  ).bind(key).first<{ count: number; window_started: string }>()

  if (!row) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (key, count, window_started) VALUES (?1, 1, ?2)'
    ).bind(key, new Date(now).toISOString()).run()
    return { allowed: true, remaining: limit - 1, resetIn: windowSec }
  }

  const started = new Date(row.window_started).getTime()
  if (now - started > windowMs) {
    await env.DB.prepare(
      'UPDATE rate_limits SET count = 1, window_started = ?1 WHERE key = ?2'
    ).bind(new Date(now).toISOString(), key).run()
    return { allowed: true, remaining: limit - 1, resetIn: windowSec }
  }

  if (row.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((windowMs - (now - started)) / 1000) }
  }

  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?1').bind(key).run()
  return { allowed: true, remaining: limit - row.count - 1, resetIn: Math.ceil((windowMs - (now - started)) / 1000) }
}
