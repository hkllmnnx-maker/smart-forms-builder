/**
 * Google Forms API service.
 * Docs: https://developers.google.com/forms/api/reference/rest
 *
 * Flow:
 *  1) forms.create with { info: { title } }   -> get formId
 *  2) forms.batchUpdate with updateFormInfo + createItem requests
 *  3) Read final form for responderUri / editUri
 */
import type { AnalysisResult, AnalyzedQuestion } from '../types/questions'

export interface CreatedFormInfo {
  formId: string
  responderUri: string
  editUri: string
  title: string
  description?: string
  questionCount: number
}

const FORMS_API = 'https://forms.googleapis.com/v1/forms'

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
}

async function gfetch(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let detail = ''
    try { detail = JSON.stringify(await res.json()) } catch { detail = await res.text() }
    throw new Error(`Google Forms API ${res.status}: ${detail.slice(0, 800)}`)
  }
  return res.json()
}

/** Build batchUpdate request items from analyzed questions. */
function buildRequests(analysis: AnalysisResult): any[] {
  const requests: any[] = []

  if (analysis.formDescription) {
    requests.push({
      updateFormInfo: {
        info: { description: analysis.formDescription },
        updateMask: 'description'
      }
    })
  }

  let index = 0
  let lastSection: string | null = null

  for (const q of analysis.questions) {
    // Insert a page break when section changes (other than first)
    if (q.type === 'section_header') {
      lastSection = q.title
      requests.push({
        createItem: {
          item: {
            title: q.title,
            description: q.description,
            pageBreakItem: {}
          },
          location: { index }
        }
      })
      index++
      continue
    }

    if (q.type === 'description') {
      requests.push({
        createItem: {
          item: {
            title: q.title,
            description: q.description,
            textItem: {}
          },
          location: { index }
        }
      })
      index++
      continue
    }

    const item: any = {
      title: q.title.slice(0, 1000),
      description: q.description
    }

    const question: any = { required: !!q.required }

    switch (q.type) {
      case 'short_text':
        question.textQuestion = { paragraph: false }
        break
      case 'long_text':
        question.textQuestion = { paragraph: true }
        break
      case 'email':
        question.textQuestion = { paragraph: false }
        item.description = (item.description ? item.description + ' ' : '') + '(يُرجى إدخال بريد إلكتروني صحيح)'
        break
      case 'phone':
        question.textQuestion = { paragraph: false }
        item.description = (item.description ? item.description + ' ' : '') + '(يُرجى إدخال رقم هاتف صحيح)'
        break
      case 'number':
        question.textQuestion = { paragraph: false }
        item.description = (item.description ? item.description + ' ' : '') + '(الرجاء إدخال رقم)'
        break
      case 'date':
        question.dateQuestion = { includeTime: false, includeYear: true }
        break
      case 'time':
        question.timeQuestion = { duration: false }
        break
      case 'yes_no':
        question.choiceQuestion = {
          type: 'RADIO',
          options: [{ value: 'نعم' }, { value: 'لا' }],
          shuffle: false
        }
        break
      case 'likert_5':
        question.choiceQuestion = {
          type: 'RADIO',
          options: (q.options && q.options.length >= 4
            ? q.options.map((o) => ({ value: o.label }))
            : [
                { value: 'أوافق بشدة' },
                { value: 'أوافق' },
                { value: 'محايد' },
                { value: 'لا أوافق' },
                { value: 'لا أوافق بشدة' }
              ]),
          shuffle: false
        }
        break
      case 'multiple_choice':
        question.choiceQuestion = {
          type: 'RADIO',
          options: (q.options || []).map((o) => o.isOther ? { isOther: true } : { value: o.label }),
          shuffle: false
        }
        break
      case 'checkboxes':
        question.choiceQuestion = {
          type: 'CHECKBOX',
          options: (q.options || []).map((o) => o.isOther ? { isOther: true } : { value: o.label }),
          shuffle: false
        }
        break
      case 'dropdown':
        question.choiceQuestion = {
          type: 'DROP_DOWN',
          options: (q.options || []).map((o) => ({ value: o.label })),
          shuffle: false
        }
        break
      case 'scale':
        question.scaleQuestion = {
          low: q.scaleMin ?? 1,
          high: q.scaleMax ?? 5,
          lowLabel: q.scaleMinLabel,
          highLabel: q.scaleMaxLabel
        }
        break
      default:
        question.textQuestion = { paragraph: false }
    }

    item.questionItem = { question }

    requests.push({
      createItem: {
        item,
        location: { index }
      }
    })
    index++
  }

  return requests
}

export async function createGoogleForm(
  accessToken: string,
  analysis: AnalysisResult
): Promise<CreatedFormInfo> {
  // 1) Create with title only (API restriction)
  const created = await gfetch(FORMS_API, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ info: { title: analysis.formTitle.slice(0, 250) } })
  })

  const formId = created.formId as string

  const requests = buildRequests(analysis)
  if (requests.length) {
    await gfetch(`${FORMS_API}/${formId}:batchUpdate`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ requests, includeFormInResponse: false })
    })
  }

  // 3) Re-read
  const final = await gfetch(`${FORMS_API}/${formId}`, {
    method: 'GET',
    headers: authHeaders(accessToken)
  })

  return {
    formId,
    responderUri: final.responderUri,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
    title: final.info?.title || analysis.formTitle,
    description: final.info?.description,
    questionCount: (final.items || []).length
  }
}
