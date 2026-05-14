import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { extractTextFromDocx } from '../src/services/docx'

function buildFakeDocx(paragraphs: string[]): ArrayBuffer {
  const xmlParas = paragraphs
    .map((p) => `<w:p><w:r><w:t>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</w:t></w:r></w:p>`)
    .join('')
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${xmlParas}</w:body>
</w:document>`
  const zipped = zipSync({
    '[Content_Types].xml': strToU8('<x/>'),
    'word/document.xml': strToU8(documentXml)
  })
  // create a real ArrayBuffer (not SharedArrayBuffer)
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer
}

describe('extractTextFromDocx', () => {
  it('extracts Arabic paragraphs', async () => {
    const ab = buildFakeDocx(['ما اسمك؟', 'نعم', 'لا'])
    const r = await extractTextFromDocx(ab)
    expect(r.text).toContain('ما اسمك؟')
    expect(r.text).toContain('نعم')
    expect(r.paragraphs).toBe(3)
  })

  it('rejects invalid file', async () => {
    const bad = new TextEncoder().encode('not a zip').buffer as ArrayBuffer
    await expect(extractTextFromDocx(bad)).rejects.toThrow()
  })
})
