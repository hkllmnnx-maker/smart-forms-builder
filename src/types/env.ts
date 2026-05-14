/**
 * Cloudflare Pages binding types injected at runtime.
 * Secrets are added via `wrangler pages secret put` or .dev.vars.
 */
export type Bindings = {
  DB: D1Database

  // Secrets / vars
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_REDIRECT_URI: string
  SESSION_SECRET: string

  AI_PROVIDER?: string // 'openai' | 'gemini' | 'none'
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string

  APP_URL?: string
}

export type Variables = {
  user?: {
    id: string
    email: string
    name?: string | null
    picture?: string | null
  }
  sessionId?: string
  requestId?: string
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }
