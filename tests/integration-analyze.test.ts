import { describe, it, expect } from 'vitest'
import { analyzeWithRules } from '../src/services/analyzer'

const FULL_SURVEY = `استبيان رضا الطلاب

ما اسمك؟ (مطلوب)

البريد الإلكتروني

رقم الجوال

ما مستواك الدراسي؟
بكالوريوس
ماجستير
دكتوراه

هل تستخدم Google Forms؟
نعم
لا

قيّم الخدمات:
أوافق بشدة
أوافق
محايد
لا أوافق
لا أوافق بشدة

اختر كل ما ينطبق من المنصات:
Google Forms
Microsoft Forms
Typeform
أخرى: اذكرها

ما مقترحاتك لتحسين الخدمة؟`

describe('full survey end-to-end (rules)', () => {
  it('analyzes a complete mixed survey correctly', () => {
    const r = analyzeWithRules(FULL_SURVEY)
    const types = r.questions.map((q) => q.type)
    // Required name marked
    const nameQ = r.questions.find((q) => q.title.includes('اسمك'))
    expect(nameQ?.required).toBe(true)

    expect(types).toContain('email')
    expect(types).toContain('phone')
    expect(types).toContain('multiple_choice')
    expect(types).toContain('yes_no')
    expect(types).toContain('likert_5')
    expect(types).toContain('checkboxes')
    expect(types).toContain('long_text')

    // Form title detection
    expect(r.formTitle).toContain('استبيان')
    // Language detection
    expect(r.language === 'ar' || r.language === 'mixed').toBe(true)
  })
})
