import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_GEMINI_MODEL, getGeminiKey, getGeminiModel, readReceiptWithGemini, saveGeminiKey, saveGeminiModel } from './geminiService'

const image = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })

function geminiReply(json: unknown): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }), { status: 200 })
}

const GOOD = {
  vendorName: 'CÔNG TY TNHH GRAB',
  invoiceDate: '2026-10-01',
  items: [
    { name: 'Cước phí vận chuyển', quantity: 1, unitPrice: 61000, amount: 61000 },
    { name: 'Phí dịch vụ', quantity: 1, unitPrice: 5000, amount: 5000 },
  ],
  discountAmount: 6000,
  total: 60000,
  itemRowCount: 2,
  vatIncludedInPrices: true,
}

beforeEach(() => {
  localStorage.clear()
  saveGeminiKey('test-key')
})
afterEach(() => vi.unstubAllGlobals())

describe('khoá và mô hình Gemini', () => {
  it('lưu, đọc và xoá khoá; mô hình mặc định khi chưa chọn', () => {
    expect(getGeminiKey()).toBe('test-key')
    saveGeminiKey('')
    expect(getGeminiKey()).toBe('')
    expect(getGeminiModel()).toBe(DEFAULT_GEMINI_MODEL)
    saveGeminiModel('gemini-x')
    expect(getGeminiModel()).toBe('gemini-x')
  })
})

describe('readReceiptWithGemini', () => {
  it('gửi ảnh + gợi ý OCR, nhận kết quả khớp tổng ngay lần đầu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiReply(GOOD))
    vi.stubGlobal('fetch', fetchMock)
    const result = await readReceiptWithGemini([image], { ocrText: 'Tổng cộng 60.000' })

    expect(result.rounds).toBe(1)
    expect(result.check.status).toBe('OK')
    expect(result.receipt.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 6000 })
    expect(result.receipt.vat).toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain(`/${DEFAULT_GEMINI_MODEL}:generateContent`)
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key')
    const body = JSON.parse(init.body as string)
    const parts = body.contents[0].parts
    expect(parts[0].text).toContain('Tổng cộng 60.000')
    expect(parts[1].inlineData.mimeType).toBe('image/jpeg')
    expect(body.generationConfig.responseMimeType).toBe('application/json')
  })

  it('tổng chưa khớp thì hỏi lại một lần kèm chỗ lệch và nhận kết quả đã sửa', async () => {
    const wrong = { ...GOOD, items: [{ name: 'Cước phí vận chuyển', quantity: 1, unitPrice: 81000, amount: 81000 }, GOOD.items[1]] }
    const fetchMock = vi.fn().mockResolvedValueOnce(geminiReply(wrong)).mockResolvedValueOnce(geminiReply(GOOD))
    vi.stubGlobal('fetch', fetchMock)
    const result = await readReceiptWithGemini([image], { ocrText: '' })

    expect(result.rounds).toBe(2)
    expect(result.check.status).toBe('OK')
    const second = JSON.parse((fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string)
    expect(second.contents).toHaveLength(3)
    expect(second.contents[2].parts[0].text).toContain('do not add up')
  })

  it('AI đếm 3 dòng nhưng trả 2 món: báo có thể thiếu món', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(geminiReply({ ...GOOD, itemRowCount: 3 }))))
    const result = await readReceiptWithGemini([image], { ocrText: '' })
    expect(result.rounds).toBe(2)
    expect(result.check.status).toBe('MISMATCH')
    expect(result.check.notes.join('\n')).toContain('thiếu')
  })

  it('không có khoá thì báo AI_NO_KEY, khoá bị từ chối thì báo rõ', async () => {
    saveGeminiKey('')
    await expect(readReceiptWithGemini([image], { ocrText: '' })).rejects.toMatchObject({ code: 'AI_NO_KEY' })

    saveGeminiKey('bad')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 })))
    await expect(readReceiptWithGemini([image], { ocrText: '' })).rejects.toMatchObject({ code: 'AI_FAILED', message: expect.stringContaining('khoá API') })
  })
})
