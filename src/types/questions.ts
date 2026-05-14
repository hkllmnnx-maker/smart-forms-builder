/**
 * Strict schema for analyzed questions.
 * This is the contract between the analyzer (rules + AI) and the
 * Google Forms creator service.
 */
export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'   // radio
  | 'checkboxes'        // multi-select
  | 'dropdown'
  | 'yes_no'
  | 'likert_5'
  | 'scale'             // linear scale (numeric)
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'time'
  | 'section_header'
  | 'description'

export interface QuestionOption {
  label: string
  isOther?: boolean
}

export interface AnalyzedQuestion {
  id: string                 // client side stable id
  type: QuestionType
  title: string
  description?: string
  required?: boolean
  options?: QuestionOption[]
  // For scale/likert
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
  // Section grouping
  section?: string | null
}

export interface AnalysisResult {
  formTitle: string
  formDescription?: string
  language: 'ar' | 'en' | 'mixed'
  questions: AnalyzedQuestion[]
  warnings?: string[]
  source: 'rules' | 'ai' | 'hybrid'
}
