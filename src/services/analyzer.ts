/**
 * Hybrid question analyzer.
 *
 * 1) Pre-clean and normalize text.
 * 2) Heuristic / regex extraction (Arabic + English friendly).
 * 3) Optional AI provider call for ambiguous / improved structuring.
 * 4) Strict schema validation + auto-repair.
 *
 * Goal: be GOOD without AI (rule-based) and GREAT with it.
 */

import type {
  AnalysisResult,
  AnalyzedQuestion,
  QuestionOption,
  QuestionType
} from '../types/questions'

// ---------- Utilities ----------

const ARABIC_RE = /[\u0600-\u06FF]/
const EMAIL_KEYWORDS = ['email', 'e-mail', 'بريد', 'الايميل', 'الإيميل', 'بريد إلكتروني', 'البريد الإلكتروني']
const PHONE_KEYWORDS = ['phone', 'mobile', 'هاتف', 'جوال', 'موبايل', 'رقم الهاتف', 'رقم الجوال']
const DATE_KEYWORDS = ['date', 'تاريخ', 'الميلاد', 'تاريخ الميلاد']
const TIME_KEYWORDS = ['time', 'الوقت', 'الساعة']
const NUMBER_KEYWORDS = ['عمر', 'العمر', 'السن', 'العدد', 'كم', 'how many', 'how much', 'age', 'count']
const LONG_KEYWORDS = ['اشرح', 'وضح', 'تفاصيل', 'مقترحات', 'ملاحظات', 'رأيك', 'وصف', 'explain', 'describe', 'comments', 'suggestions', 'feedback']
const REQUIRED_KEYWORDS = ['(مطلوب)', '*', '(اجباري)', '(إجباري)', '(required)']

const LIKERT_SETS: string[][] = [
  // Arabic 5-point agreement
  ['أوافق بشدة', 'أوافق', 'محايد', 'لا أوافق', 'لا أوافق بشدة'],
  ['اوافق بشدة', 'اوافق', 'محايد', 'لا اوافق', 'لا اوافق بشدة'],
  // English 5-point agreement
  ['strongly agree', 'agree', 'neutral', 'disagree', 'strongly disagree'],
  // Arabic frequency
  ['دائماً', 'غالباً', 'أحياناً', 'نادراً', 'أبداً'],
  ['دائما', 'غالبا', 'أحيانا', 'نادرا', 'أبدا'],
  // English frequency
  ['always', 'often', 'sometimes', 'rarely', 'never'],
  // Arabic satisfaction
  ['راضٍ جداً', 'راضٍ', 'محايد', 'غير راضٍ', 'غير راضٍ إطلاقاً']
]

const YES_NO_SETS: string[][] = [
  ['نعم', 'لا'],
  ['yes', 'no'],
  ['Yes', 'No']
]

function isArabic(s: string): boolean { return ARABIC_RE.test(s) }

function normalize(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripBullet(line: string): string {
  return line.replace(/^\s*([-*•●○◦▪️·]|\(?[0-9]+[).\-:]|[a-zA-Z][).\-:]|[\u0660-\u0669]+[).\-:])\s*/, '').trim()
}

function isHeader(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  // Markdown header
  if (/^#{1,3}\s+/.test(trimmed)) return true
  // Section: / القسم: / الجزء:
  if (/^(section|القسم|الجزء|الباب)\s*[:\-]/i.test(trimmed)) return true
  // Bold-like style: SECTION ... or surrounded by ===
  if (/^={3,}/.test(trimmed) || /^-{3,}/.test(trimmed)) return true
  return false
}

function detectRequired(text: string): { required: boolean; clean: string } {
  let required = false
  let clean = text
  for (const k of REQUIRED_KEYWORDS) {
    if (clean.includes(k)) {
      required = true
      clean = clean.split(k).join('').trim()
    }
  }
  // trailing * marker
  if (/\*\s*$/.test(clean)) { required = true; clean = clean.replace(/\*\s*$/, '').trim() }
  return { required, clean }
}

function looksLikeQuestion(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (t.endsWith('؟') || t.endsWith('?')) return true
  if (/^(ما|هل|كم|متى|أين|اين|كيف|لماذا|من)\b/.test(t)) return true
  if (/^(what|how|why|when|where|who|which|do|does|did|is|are|can|could|would|should)\b/i.test(t)) return true
  // colon at the end often introduces a question/field
  if (/[:：]\s*$/.test(t)) return true
  return false
}

function detectQuestionTypeByKeywords(title: string): QuestionType | null {
  const lc = title.toLowerCase()
  if (EMAIL_KEYWORDS.some((k) => lc.includes(k.toLowerCase()))) return 'email'
  if (PHONE_KEYWORDS.some((k) => lc.includes(k.toLowerCase()))) return 'phone'
  if (DATE_KEYWORDS.some((k) => lc.includes(k.toLowerCase()))) return 'date'
  if (TIME_KEYWORDS.some((k) => lc.includes(k.toLowerCase()))) return 'time'
  if (NUMBER_KEYWORDS.some((k) => lc.includes(k.toLowerCase()))) return 'number'
  if (LONG_KEYWORDS.some((k) => lc.includes(k.toLowerCase()))) return 'long_text'
  return null
}

function similarSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const norm = (s: string) => s.trim().toLowerCase()
  const A = new Set(a.map(norm))
  for (const x of b) if (!A.has(norm(x))) return false
  return true
}

function isLikertOptions(opts: string[]): boolean {
  if (opts.length < 4 || opts.length > 7) return false
  return LIKERT_SETS.some((set) => {
    if (Math.abs(set.length - opts.length) > 1) return false
    const matches = set.filter((s) => opts.some((o) => o.trim().toLowerCase().includes(s.toLowerCase()))).length
    return matches >= Math.min(4, set.length - 1)
  })
}

function isYesNoOptions(opts: string[]): boolean {
  if (opts.length !== 2) return false
  return YES_NO_SETS.some((set) => similarSet(set, opts))
}

// ---------- Block extraction ----------

interface RawBlock {
  title: string
  options: string[]
  required: boolean
  isHeader: boolean
}

function splitBlocks(text: string): RawBlock[] {
  const lines = normalize(text).split('\n')
  const blocks: RawBlock[] = []
  let cur: RawBlock | null = null

  const pushCur = () => {
    if (cur && (cur.title || cur.options.length)) blocks.push(cur)
    cur = null
  }

  const optionLineRe = /^\s*([-*•●○◦▪️·]|\(?[0-9]+[).\-:]|[a-zA-Z][).\-:]|[\u0660-\u0669]+[).\-:])\s+\S/

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) {
      pushCur()
      continue
    }

    if (isHeader(line)) {
      pushCur()
      blocks.push({
        title: line.replace(/^#{1,3}\s+/, '').replace(/^(section|القسم|الجزء|الباب)\s*[:\-]\s*/i, '').replace(/^={3,}|={3,}$|^-{3,}|-{3,}$/g, '').trim(),
        options: [],
        required: false,
        isHeader: true
      })
      continue
    }

    // Detect option line
    if (optionLineRe.test(raw) && cur) {
      cur.options.push(stripBullet(raw))
      continue
    }

    // New question candidate
    if (looksLikeQuestion(line) || !cur) {
      pushCur()
      const { required, clean } = detectRequired(line)
      cur = { title: clean.replace(/[:：]\s*$/, '').trim(), options: [], required, isHeader: false }
      continue
    }

    // continuation -- treat short candidate words as options if followed by similar lines
    if (cur && line.length <= 80 && !looksLikeQuestion(line)) {
      cur.options.push(stripBullet(line))
    } else {
      pushCur()
      const { required, clean } = detectRequired(line)
      cur = { title: clean, options: [], required, isHeader: false }
    }
  }
  pushCur()
  return blocks.filter((b) => b.title || b.options.length)
}

function detectType(block: RawBlock): QuestionType {
  const opts = block.options.map((o) => o.trim()).filter(Boolean)
  if (block.isHeader) return 'section_header'

  if (opts.length >= 2) {
    if (isYesNoOptions(opts)) return 'yes_no'
    if (isLikertOptions(opts)) return 'likert_5'

    const hasOther = opts.some((o) => /(^| )(أخرى|اخرى|other)\b/i.test(o) || /أخرى\s*:|other\s*:/i.test(o))
    // checkboxes vs multiple choice vs dropdown
    if (opts.length > 6) return 'dropdown'
    // If the question hints multi-select
    if (/اختر كل ما ينطبق|select all|اختر أكثر|تطبق|قد تنطبق/i.test(block.title)) return 'checkboxes'
    if (hasOther) return 'multiple_choice'
    return 'multiple_choice'
  }

  // No options - infer from text
  const kw = detectQuestionTypeByKeywords(block.title)
  if (kw) return kw
  if (block.title.length > 100) return 'long_text'
  return 'short_text'
}

function buildOptions(block: RawBlock): QuestionOption[] | undefined {
  if (!block.options.length) return undefined
  return block.options.map((o) => {
    const isOther = /^(أخرى|اخرى|other)\b/i.test(o) || /أخرى\s*:|other\s*:/i.test(o)
    return { label: o.replace(/[:：].*$/, '').trim() || o.trim(), isOther } as QuestionOption
  })
}

function genId(): string {
  return 'q_' + Math.random().toString(36).slice(2, 10)
}

// ---------- Title detection ----------

function detectFormTitle(rawText: string): { title: string; description?: string } {
  const lines = normalize(rawText).split('\n').map((l) => l.trim()).filter(Boolean)
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const l = lines[i]
    if (looksLikeQuestion(l)) continue
    if (l.length > 4 && l.length < 120 && !/^[-*•]/.test(l)) {
      // Maybe description follows
      const desc = lines[i + 1] && !looksLikeQuestion(lines[i + 1]) && lines[i + 1].length < 240
        ? lines[i + 1]
        : undefined
      return { title: l.replace(/^#{1,3}\s+/, ''), description: desc }
    }
  }
  return { title: 'استبيان جديد' }
}

// ---------- Public API ----------

export function analyzeWithRules(text: string): AnalysisResult {
  const cleaned = normalize(text)
  const blocks = splitBlocks(cleaned)
  const { title, description } = detectFormTitle(cleaned)

  let currentSection: string | null = null
  const questions: AnalyzedQuestion[] = []

  for (const b of blocks) {
    const t = detectType(b)
    if (t === 'section_header') {
      currentSection = b.title || null
      questions.push({
        id: genId(),
        type: 'section_header',
        title: b.title || 'قسم',
        section: currentSection
      })
      continue
    }
    questions.push({
      id: genId(),
      type: t,
      title: b.title || '(بدون عنوان)',
      required: b.required || undefined,
      options: buildOptions(b),
      section: currentSection
    })
  }

  // Auto-add scale defaults
  for (const q of questions) {
    if (q.type === 'scale') {
      q.scaleMin = q.scaleMin ?? 1
      q.scaleMax = q.scaleMax ?? 5
    }
  }

  const lang: 'ar' | 'en' | 'mixed' = isArabic(cleaned)
    ? (/[a-zA-Z]/.test(cleaned) ? 'mixed' : 'ar')
    : 'en'

  return {
    formTitle: title,
    formDescription: description,
    language: lang,
    questions,
    source: 'rules'
  }
}

// ---------- AI provider abstraction (optional enhancement) ----------

export interface AIProviderConfig {
  provider: 'openai' | 'gemini' | 'none'
  apiKey?: string
  model?: string
}

const AI_SYSTEM_PROMPT = `You are an expert form designer. Convert raw, possibly messy bilingual (Arabic/English) survey text into a strict JSON schema.

Return ONLY valid JSON matching this shape:
{
  "formTitle": "string",
  "formDescription": "string (optional)",
  "language": "ar" | "en" | "mixed",
  "questions": [
    {
      "id": "string",
      "type": "short_text|long_text|multiple_choice|checkboxes|dropdown|yes_no|likert_5|scale|email|phone|number|date|time|section_header|description",
      "title": "string",
      "description": "string (optional)",
      "required": true|false,
      "options": [ { "label": "string", "isOther": true|false } ],
      "scaleMin": 1, "scaleMax": 5,
      "section": "string|null"
    }
  ]
}

Rules:
- Identify Likert (5-point agreement/frequency) → type "likert_5".
- Identify Yes/No → type "yes_no".
- Single-select with up to 6 options → "multiple_choice"; more → "dropdown".
- "Select all that apply" → "checkboxes".
- Detect "other:" option (isOther = true).
- Email/phone/number/date/time inferred from keywords.
- Long-form opinion → "long_text"; short factual → "short_text".
- Preserve original wording. Do NOT invent questions.
- Output JSON only. No markdown fences.`

export async function analyzeWithAI(text: string, cfg: AIProviderConfig): Promise<AnalysisResult | null> {
  if (cfg.provider === 'none' || !cfg.apiKey) return null
  try {
    if (cfg.provider === 'openai') return await callOpenAI(text, cfg)
    if (cfg.provider === 'gemini') return await callGemini(text, cfg)
  } catch (e) {
    console.warn('AI analyze failed:', (e as Error).message)
  }
  return null
}

async function callOpenAI(text: string, cfg: AIProviderConfig): Promise<AnalysisResult | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: cfg.model || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: text.slice(0, 16000) }
      ]
    })
  })
  if (!res.ok) return null
  const data = await res.json() as any
  const content = data?.choices?.[0]?.message?.content
  return parseAIJson(content)
}

async function callGemini(text: string, cfg: AIProviderConfig): Promise<AnalysisResult | null> {
  const model = cfg.model || 'gemini-2.0-flash'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${cfg.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      contents: [{ role: 'user', parts: [{ text: text.slice(0, 16000) }] }]
    })
  })
  if (!res.ok) return null
  const data = await res.json() as any
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return parseAIJson(content)
}

function parseAIJson(content: any): AnalysisResult | null {
  if (!content) return null
  try {
    const obj = typeof content === 'string' ? JSON.parse(content) : content
    return validateAndRepair(obj)
  } catch {
    // try to extract JSON from possible fenced text
    if (typeof content === 'string') {
      const m = content.match(/\{[\s\S]*\}/)
      if (m) {
        try { return validateAndRepair(JSON.parse(m[0])) } catch { return null }
      }
    }
    return null
  }
}

const VALID_TYPES: QuestionType[] = [
  'short_text','long_text','multiple_choice','checkboxes','dropdown','yes_no',
  'likert_5','scale','email','phone','number','date','time','section_header','description'
]

export function validateAndRepair(obj: any): AnalysisResult {
  const out: AnalysisResult = {
    formTitle: typeof obj?.formTitle === 'string' && obj.formTitle.trim() ? obj.formTitle.trim() : 'استبيان جديد',
    formDescription: typeof obj?.formDescription === 'string' ? obj.formDescription : undefined,
    language: ['ar','en','mixed'].includes(obj?.language) ? obj.language : 'mixed',
    questions: [],
    source: 'ai'
  }
  const arr = Array.isArray(obj?.questions) ? obj.questions : []
  for (const q of arr) {
    if (!q || typeof q !== 'object') continue
    let type: QuestionType = VALID_TYPES.includes(q.type) ? q.type : 'short_text'
    let options: QuestionOption[] | undefined = undefined
    if (Array.isArray(q.options)) {
      options = q.options
        .map((o: any) => {
          if (typeof o === 'string') return { label: o.trim() } as QuestionOption
          if (o && typeof o.label === 'string') return { label: o.label.trim(), isOther: !!o.isOther } as QuestionOption
          return null
        })
        .filter(Boolean) as QuestionOption[]
      if (!options.length) options = undefined
    }
    if (['multiple_choice','checkboxes','dropdown','likert_5','yes_no'].includes(type) && (!options || options.length < 2)) {
      // demote to short_text if missing options
      type = 'short_text'
      options = undefined
    }
    const title = (typeof q.title === 'string' && q.title.trim()) ? q.title.trim() : '(بدون عنوان)'
    out.questions.push({
      id: typeof q.id === 'string' ? q.id : 'q_' + Math.random().toString(36).slice(2, 10),
      type,
      title,
      description: typeof q.description === 'string' ? q.description : undefined,
      required: !!q.required || undefined,
      options,
      scaleMin: typeof q.scaleMin === 'number' ? q.scaleMin : (type === 'scale' ? 1 : undefined),
      scaleMax: typeof q.scaleMax === 'number' ? q.scaleMax : (type === 'scale' ? 5 : undefined),
      section: typeof q.section === 'string' ? q.section : null
    })
  }
  return out
}

/** Top-level hybrid analyze: rules first, optional AI merge. */
export async function analyzeHybrid(text: string, cfg: AIProviderConfig): Promise<AnalysisResult> {
  const base = analyzeWithRules(text)

  if (cfg.provider !== 'none' && cfg.apiKey) {
    const aiResult = await analyzeWithAI(text, cfg)
    if (aiResult && aiResult.questions.length >= Math.max(1, base.questions.length - 1)) {
      // Prefer AI's deeper understanding but keep our title/desc if AI's missing
      aiResult.formTitle = aiResult.formTitle || base.formTitle
      aiResult.formDescription = aiResult.formDescription || base.formDescription
      aiResult.source = 'hybrid'
      return aiResult
    }
  }
  return base
}
