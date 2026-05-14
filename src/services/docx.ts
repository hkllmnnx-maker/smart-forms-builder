/**
 * Minimal docx -> plain text extractor that runs in Cloudflare Workers.
 *
 * A .docx file is a ZIP container. We use fflate to unzip in pure JS,
 * then extract text from word/document.xml by stripping XML tags and
 * mapping <w:p> -> newline and <w:tab> -> tab.
 */
import { unzipSync, strFromU8 } from 'fflate'

export interface DocxExtractResult {
  text: string
  paragraphs: number
}

export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<DocxExtractResult> {
  const u8 = new Uint8Array(buffer)
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(u8)
  } catch (e) {
    throw new Error('الملف ليس ملف Word صالح (.docx)')
  }

  const doc = unzipped['word/document.xml']
  if (!doc) throw new Error('لم يتم العثور على محتوى المستند داخل ملف Word')

  const xml = strFromU8(doc)

  // Convert paragraph closes + breaks to newlines BEFORE stripping tags.
  let interim = xml
    .replace(/<w:tab[^>]*\/?>/g, '\t')
    .replace(/<w:br[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')

  // Strip all remaining XML tags
  let text = interim.replace(/<[^>]+>/g, '')

  // Decode XML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))

  // Normalize whitespace
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  const paragraphs = text.split('\n').filter((l) => l.trim()).length

  return { text, paragraphs }
}
