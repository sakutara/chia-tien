import { describe, expect, it } from 'vitest'
import { buildLocalSlmPrompt, LOCAL_SLM_SYSTEM_PROMPT } from './aiReceipt'
import type { ParsedReceipt } from './receiptParser'

describe('LOCAL_SLM_SYSTEM_PROMPT (Qwen2.5-0.5B, chỉ văn bản)', () => {
  it('ngắn, chỉ yêu cầu JSON và không nhắc tới ảnh', () => {
    expect(LOCAL_SLM_SYSTEM_PROMPT.length).toBeLessThan(1500)
    expect(LOCAL_SLM_SYSTEM_PROMPT).toMatch(/JSON/)
    expect(LOCAL_SLM_SYSTEM_PROMPT.toLowerCase()).not.toMatch(/image|photo|pdf/)
  })
})

describe('buildLocalSlmPrompt', () => {
  it('đưa văn bản OCR vào prompt', () => {
    const prompt = buildLocalSlmPrompt({ ocrText: '  Bún bò 50.000  ' })
    expect(prompt).toContain('Bún bò 50.000')
    expect(prompt.trim().endsWith('Return the JSON object now.')).toBe(true)
  })

  it('kèm dòng và tổng của Rule Parser, và lỗi đối soát', () => {
    const parsed: ParsedReceipt = {
      items: [{ name: 'Bún bò', quantity: 1, unitPrice: 50000, rawAmount: 50000, uncertain: false }],
      billTotal: 60000,
      tableRows: { expected: 2, read: 1, unread: ['STT 2'] },
    }
    const prompt = buildLocalSlmPrompt({ ocrText: 'x', parsed, notes: ['Tổng lệch 10.000'] })
    expect(prompt).toContain('- Bún bò | qty 1 | unit 50000 | amount 50000')
    expect(prompt).toContain('Rule parser total: 60000')
    expect(prompt).toContain('The table has 2 numbered rows; 1 were read.')
    expect(prompt).toContain('- Tổng lệch 10.000')
  })

  it('cắt văn bản OCR quá dài để giữ prompt ngắn cho mô hình nhỏ', () => {
    const prompt = buildLocalSlmPrompt({ ocrText: 'a'.repeat(10_000) })
    expect(prompt.length).toBeLessThan(3_300)
  })

  it('không có gợi ý thì chỉ còn lệnh trả về JSON', () => {
    expect(buildLocalSlmPrompt({ ocrText: '   ' })).toBe('Return the JSON object now.')
  })
})
