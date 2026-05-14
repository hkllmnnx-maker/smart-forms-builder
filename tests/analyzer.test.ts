import { describe, it, expect } from 'vitest'
import { analyzeWithRules, validateAndRepair } from '../src/services/analyzer'

describe('analyzeWithRules — Arabic surveys', () => {
  it('detects Likert 5 question with Arabic agreement options', () => {
    const text = `قيّم خدماتنا
أوافق بشدة
أوافق
محايد
لا أوافق
لا أوافق بشدة`
    const r = analyzeWithRules(text)
    const q = r.questions.find((x) => x.type === 'likert_5')
    expect(q).toBeDefined()
    expect(q!.options?.length).toBe(5)
  })

  it('detects yes/no', () => {
    const text = `هل تستخدم تطبيقات الذكاء الاصطناعي في دراستك؟
نعم
لا`
    const r = analyzeWithRules(text)
    expect(r.questions[0].type).toBe('yes_no')
  })

  it('detects multiple choice with up to 6 options', () => {
    const text = `ما مستواك الدراسي؟
بكالوريوس
ماجستير
دكتوراه`
    const r = analyzeWithRules(text)
    expect(r.questions[0].type).toBe('multiple_choice')
    expect(r.questions[0].options?.length).toBe(3)
  })

  it('detects "other" option', () => {
    const text = `ما المنصة التي تستخدمها غالباً؟
Google Forms
Microsoft Forms
Typeform
أخرى: اذكرها`
    const r = analyzeWithRules(text)
    expect(r.questions[0].type).toBe('multiple_choice')
    const other = r.questions[0].options?.find((o) => o.isOther)
    expect(other).toBeDefined()
  })

  it('falls back to long_text for opinion questions', () => {
    const text = `ما مقترحاتك لتحسين الخدمة؟`
    const r = analyzeWithRules(text)
    expect(r.questions[0].type).toBe('long_text')
  })

  it('detects email by keyword', () => {
    const r = analyzeWithRules('البريد الإلكتروني')
    expect(r.questions[0].type).toBe('email')
  })

  it('detects phone by keyword', () => {
    const r = analyzeWithRules('رقم الجوال')
    expect(r.questions[0].type).toBe('phone')
  })

  it('marks required when (مطلوب) suffix present', () => {
    const text = `ما اسمك؟ (مطلوب)`
    const r = analyzeWithRules(text)
    expect(r.questions[0].required).toBe(true)
  })

  it('detects sections', () => {
    const text = `# القسم الأول
ما اسمك؟
# القسم الثاني
ما عمرك؟`
    const r = analyzeWithRules(text)
    const headers = r.questions.filter((q) => q.type === 'section_header')
    expect(headers.length).toBe(2)
  })

  it('uses dropdown for many options', () => {
    const opts = Array.from({ length: 8 }, (_, i) => `خيار ${i + 1}`).join('\n')
    const text = `اختر دولتك\n${opts}`
    const r = analyzeWithRules(text)
    expect(r.questions[0].type).toBe('dropdown')
  })

  it('detects checkboxes when prompt says select all', () => {
    const text = `اختر كل ما ينطبق:
خيار 1
خيار 2
خيار 3`
    const r = analyzeWithRules(text)
    expect(r.questions[0].type).toBe('checkboxes')
  })
})

describe('validateAndRepair', () => {
  it('demotes a multiple_choice with no options to short_text', () => {
    const r = validateAndRepair({
      formTitle: 'Test',
      questions: [{ id: 'a', type: 'multiple_choice', title: 'x' }]
    })
    expect(r.questions[0].type).toBe('short_text')
  })

  it('keeps valid schema', () => {
    const r = validateAndRepair({
      formTitle: 'Survey',
      questions: [
        { id: 'a', type: 'yes_no', title: 'Q', options: [{ label: 'نعم' }, { label: 'لا' }] }
      ]
    })
    expect(r.questions[0].type).toBe('yes_no')
  })

  it('fills in default title when missing', () => {
    const r = validateAndRepair({})
    expect(r.formTitle.length).toBeGreaterThan(0)
  })

  it('normalizes string options to objects', () => {
    const r = validateAndRepair({
      formTitle: 'T',
      questions: [{ id: 'a', type: 'multiple_choice', title: 'q', options: ['A', 'B'] }]
    })
    expect(r.questions[0].options?.[0].label).toBe('A')
  })

  it('handles invalid type by mapping to short_text', () => {
    const r = validateAndRepair({
      formTitle: 'T',
      questions: [{ id: 'a', type: 'something_bogus', title: 'q' }]
    })
    expect(r.questions[0].type).toBe('short_text')
  })
})
