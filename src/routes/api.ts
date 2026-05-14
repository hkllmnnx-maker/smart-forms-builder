import { Hono } from 'hono'
import type { AppEnv } from '../types/env'
import { requireAuth, makeRateLimiter } from '../lib/middleware'
import { analyzeHybrid, validateAndRepair, type AIProviderConfig } from '../services/analyzer'
import { extractTextFromDocx } from '../services/docx'
import { createGoogleForm } from '../services/google-forms'
import { getAccessTokenForUser } from '../lib/access-token'
import { listForms, logForm } from '../lib/db'

const api = new Hono<AppEnv>()

const MAX_TEXT_LENGTH = 60_000
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function buildAIConfig(env: AppEnv['Bindings']): AIProviderConfig {
  const provider = (env.AI_PROVIDER || 'none').toLowerCase()
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL }
  }
  if (provider === 'gemini' && env.GEMINI_API_KEY) {
    return { provider: 'gemini', apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL }
  }
  return { provider: 'none' }
}

/** POST /api/analyze  — analyze text into questions schema */
api.post('/analyze', requireAuth, makeRateLimiter({ name: 'analyze', limit: 30, windowSec: 60 }), async (c) => {
  let body: { text?: string } = {}
  try { body = await c.req.json() } catch { /* ignore */ }
  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) return c.json({ error: 'empty_text', message: 'النص فارغ' }, 400)
  if (text.length > MAX_TEXT_LENGTH) {
    return c.json({ error: 'too_long', message: `النص طويل جداً (الحد الأقصى ${MAX_TEXT_LENGTH} حرف)` }, 413)
  }

  try {
    const result = await analyzeHybrid(text, buildAIConfig(c.env))
    return c.json({ ok: true, result })
  } catch (e: any) {
    console.error('analyze error:', e.message)
    return c.json({ error: 'analyze_failed', message: 'فشل تحليل النص' }, 500)
  }
})

/** POST /api/upload — accept .docx, extract text, return text */
api.post('/upload', requireAuth, makeRateLimiter({ name: 'upload', limit: 15, windowSec: 60 }), async (c) => {
  const contentType = c.req.header('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'invalid_request', message: 'يجب أن يكون الطلب multipart/form-data' }, 400)
  }
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ error: 'no_file', message: 'لم يتم رفع أي ملف' }, 400)
  }
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'too_large', message: `حجم الملف يتجاوز ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} ميجابايت` }, 413)
  }
  const nameLower = file.name.toLowerCase()
  if (!nameLower.endsWith('.docx')) {
    return c.json({ error: 'invalid_type', message: 'الملف يجب أن يكون بصيغة .docx' }, 415)
  }
  // Validate magic bytes (PK zip header)
  const ab = await file.arrayBuffer()
  const u8 = new Uint8Array(ab.slice(0, 4))
  if (!(u8[0] === 0x50 && u8[1] === 0x4b)) {
    return c.json({ error: 'invalid_file', message: 'الملف ليس ملف Word صالح' }, 400)
  }

  try {
    const { text, paragraphs } = await extractTextFromDocx(ab)
    if (!text.trim()) return c.json({ error: 'empty_doc', message: 'الملف لا يحتوي على نص قابل للقراءة' }, 400)
    // Optionally also analyze immediately:
    const analyze = c.req.query('analyze') !== '0'
    if (analyze) {
      const result = await analyzeHybrid(text, buildAIConfig(c.env))
      return c.json({ ok: true, text, paragraphs, result })
    }
    return c.json({ ok: true, text, paragraphs })
  } catch (e: any) {
    console.error('upload error:', e.message)
    return c.json({ error: 'extract_failed', message: e.message || 'فشل استخراج النص من الملف' }, 400)
  }
})

/** POST /api/forms/create — create Google Form from analyzed schema */
api.post('/forms/create', requireAuth, makeRateLimiter({ name: 'create_form', limit: 10, windowSec: 60 }), async (c) => {
  const user = c.get('user')!
  let body: any
  try { body = await c.req.json() } catch {
    return c.json({ error: 'invalid_json', message: 'JSON غير صالح' }, 400)
  }
  if (!body || !body.analysis) {
    return c.json({ error: 'missing_analysis', message: 'بيانات التحليل مفقودة' }, 400)
  }

  let analysis
  try {
    analysis = validateAndRepair(body.analysis)
  } catch {
    return c.json({ error: 'invalid_schema', message: 'مخطط الأسئلة غير صالح' }, 400)
  }

  const realQuestions = analysis.questions.filter((q) => q.type !== 'section_header' && q.type !== 'description')
  if (realQuestions.length === 0) {
    return c.json({ error: 'no_questions', message: 'لا توجد أسئلة لإنشاء النموذج' }, 400)
  }
  if (analysis.questions.length > 200) {
    return c.json({ error: 'too_many', message: 'عدد الأسئلة كبير جداً (الحد الأقصى 200)' }, 413)
  }

  const formLogId = await logForm(c.env, {
    user_id: user.id,
    title: analysis.formTitle,
    description: analysis.formDescription,
    question_count: analysis.questions.length,
    status: 'pending',
    source_kind: body.sourceKind === 'docx' ? 'docx' : 'text'
  }).catch(() => 0)

  try {
    const accessToken = await getAccessTokenForUser(c.env, user.id)
    const created = await createGoogleForm(accessToken, analysis)

    await c.env.DB.prepare(
      `UPDATE generated_forms SET google_form_id = ?1, responder_url = ?2, edit_url = ?3, question_count = ?4, status = 'success' WHERE id = ?5`
    ).bind(created.formId, created.responderUri, created.editUri, created.questionCount, formLogId).run().catch(() => undefined)

    return c.json({ ok: true, form: created })
  } catch (e: any) {
    console.error('create form error:', e.message)
    await c.env.DB.prepare(
      `UPDATE generated_forms SET status = 'failed', error_message = ?1 WHERE id = ?2`
    ).bind(String(e.message).slice(0, 500), formLogId).run().catch(() => undefined)
    const msg = /No refresh token|re-authorize/i.test(e.message)
      ? 'انتهت صلاحية تفويض Google. الرجاء تسجيل الدخول مجدداً.'
      : 'فشل إنشاء النموذج في Google. يرجى المحاولة مرة أخرى.'
    return c.json({ error: 'create_failed', message: msg }, 502)
  }
})

/** GET /api/forms — user's history */
api.get('/forms', requireAuth, async (c) => {
  const user = c.get('user')!
  const rows = await listForms(c.env, user.id, 100)
  return c.json({ ok: true, forms: rows })
})

export default api
