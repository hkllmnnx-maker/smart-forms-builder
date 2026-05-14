import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { renderer } from './renderer'
import type { AppEnv } from './types/env'
import { authMiddleware, requireAuth, securityHeaders } from './lib/middleware'
import { randomToken } from './lib/crypto'

import authRoutes from './routes/auth'
import apiRoutes from './routes/api'

import { LandingPage } from './pages/landing'
import { LoginPage } from './pages/login'
import { DashboardPage } from './pages/dashboard'
import { CreatePage } from './pages/create'
import { HistoryPage } from './pages/history'
import { PrivacyPage, TermsPage, PermissionsPage, ErrorPage } from './pages/static-pages'
import { listForms } from './lib/db'

const app = new Hono<AppEnv>()

// Request id + logger
app.use('*', async (c, next) => {
  c.set('requestId', randomToken(8))
  return next()
})
app.use('*', logger())

// Strict security headers via hono helper + our extras
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://unpkg.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.tailwindcss.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'", 'https://accounts.google.com']
  },
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin'
}))
app.use('*', securityHeaders)

// Load user from session
app.use('*', authMiddleware)

// Renderer
app.use(renderer as any)

// ---------- Pages ----------
app.get('/', (c) => {
  const user = c.get('user')
  return c.render(<LandingPage user={user} />, { user, active: 'home' } as any)
})

app.get('/login', (c) => {
  const user = c.get('user')
  if (user) return c.redirect('/dashboard')
  const next = c.req.query('next') || '/dashboard'
  return c.render(<LoginPage next={next} />, { title: 'تسجيل الدخول', active: 'login' } as any)
})

app.get('/dashboard', requireAuth, async (c) => {
  const user = c.get('user')!
  const forms = await listForms(c.env, user.id, 100).catch(() => [])
  const total = forms.length
  const success = forms.filter((f) => f.status === 'success').length
  const failed = forms.filter((f) => f.status === 'failed').length
  return c.render(<DashboardPage user={user} stats={{ total, success, failed }} />, { title: 'لوحة التحكم', user, active: 'dashboard' } as any)
})

app.get('/create', requireAuth, (c) => {
  const user = c.get('user')!
  const tab = c.req.query('tab') === 'upload' ? 'upload' : 'text'
  return c.render(<CreatePage initialTab={tab as any} />, { title: 'إنشاء نموذج', user, active: 'create' } as any)
})

app.get('/history', requireAuth, async (c) => {
  const user = c.get('user')!
  const forms = await listForms(c.env, user.id, 200).catch(() => [])
  return c.render(<HistoryPage forms={forms} />, { title: 'سجل النماذج', user, active: 'history' } as any)
})

app.get('/privacy', (c) => c.render(<PrivacyPage />, { title: 'سياسة الخصوصية', user: c.get('user'), active: 'privacy' } as any))
app.get('/terms', (c) => c.render(<TermsPage />, { title: 'شروط الاستخدام', user: c.get('user') } as any))
app.get('/permissions', (c) => c.render(<PermissionsPage />, { title: 'الصلاحيات المطلوبة', user: c.get('user') } as any))

app.get('/error', (c) => {
  const reason = c.req.query('reason')
  return c.render(<ErrorPage reason={reason || undefined} />, { title: 'خطأ', user: c.get('user'), hideNav: false } as any)
})

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }))

// ---------- API ----------
app.route('/api/auth', authRoutes)
app.route('/api', apiRoutes)

// 404
app.notFound((c) => {
  const accept = c.req.header('accept') || ''
  if (accept.includes('application/json')) {
    return c.json({ error: 'not_found' }, 404)
  }
  return c.render(<ErrorPage reason="الصفحة المطلوبة غير موجودة" status={404} />, { title: '404', user: c.get('user') } as any)
})

// Error handler — DO NOT leak internals
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack)
  const accept = c.req.header('accept') || ''
  if (accept.includes('application/json')) {
    return c.json({ error: 'internal_error', message: 'حدث خطأ داخلي.' }, 500)
  }
  return c.render(<ErrorPage reason="حدث خطأ داخلي. حاول مرة أخرى لاحقاً." status={500} />, { title: 'خطأ' } as any)
})

export default app
