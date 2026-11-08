import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiHints } from '../domain/aiReceipt'
import type { SlmWorkerRequest, SlmWorkerResponse } from './aiContracts'
import { LOCAL_SLM_MODEL_ID } from './aiContracts'
import { clearLocalAiCache, isLocalAiEnabled, readReceiptWithLocalAi, setLocalAiEnabled, verifyModelCache } from './localAiService'
import { PeopleError } from './peopleErrors'

/** Mỗi lượt GENERATE lấy một phần tử: chuỗi JSON trả về, hoặc `{ error }` để worker báo lỗi. */
type Generation = string | { error: { code: 'AI_OUT_OF_MEMORY' | 'AI_FAILED'; message: string } }

class FakeWorker {
  static instances: FakeWorker[] = []
  static generations: Generation[] = []
  terminated = false
  private listeners = new Map<string, Set<(event: { data: SlmWorkerResponse }) => void>>()

  constructor() {
    FakeWorker.instances.push(this)
  }

  addEventListener(type: string, fn: (event: { data: SlmWorkerResponse }) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)?.add(fn)
  }

  removeEventListener(type: string, fn: (event: { data: SlmWorkerResponse }) => void) {
    this.listeners.get(type)?.delete(fn)
  }

  postMessage(request: SlmWorkerRequest) {
    queueMicrotask(() => {
      const reply = (data: SlmWorkerResponse) => this.listeners.get('message')?.forEach((fn) => fn({ data }))
      if (request.type === 'LOAD_MODEL') {
        reply({ type: 'LOADED', requestId: request.requestId })
        return
      }
      const next = FakeWorker.generations.shift()
      if (typeof next === 'object') reply({ type: 'ERROR', requestId: request.requestId, ...next.error })
      else reply({ type: 'RESULT', requestId: request.requestId, rawJson: next ?? '' })
    })
  }

  terminate() {
    this.terminated = true
  }
}

/** Cache Storage giả: danh sách URL đã tải và dung lượng của từng file. */
let cacheEntries: Array<{ url: string; size: number }> = []

function stubCache() {
  const cache = {
    keys: async () => cacheEntries.map((e) => ({ url: e.url })),
    match: async (request: { url: string }) => {
      const entry = cacheEntries.find((e) => e.url === request.url)
      return { headers: { get: (name: string) => (name === 'content-length' && entry ? String(entry.size) : null) } }
    },
    delete: async (request: { url: string }) => {
      cacheEntries = cacheEntries.filter((e) => e.url !== request.url)
      return true
    },
  }
  vi.stubGlobal('caches', { open: async () => cache })
}

/** Hoá đơn 1 món: tổng 50.000 khớp; tổng 60.000 thì lệch để kích hoạt lượt đọc lại. */
const matching = JSON.stringify({ items: [{ name: 'Bún bò', quantity: 1, unitPrice: 50000, amount: 50000 }], total: 50000, itemRowCount: 1 })
const mismatching = JSON.stringify({ items: [{ name: 'Bún bò', quantity: 1, unitPrice: 50000, amount: 50000 }], total: 60000, itemRowCount: 1 })
const hints: AiHints = { ocrText: 'Bún bò 1 50.000 50.000\nTổng 60.000' }

beforeEach(() => {
  FakeWorker.instances = []
  FakeWorker.generations = []
  cacheEntries = []
  localStorage.clear()
  vi.stubGlobal('Worker', FakeWorker)
  stubCache()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('trạng thái bật/tắt', () => {
  it('chưa gạt lần nào thì theo việc mô hình đã có sẵn', async () => {
    expect(isLocalAiEnabled()).toBe(false)
    cacheEntries = [{ url: `https://huggingface.co/${LOCAL_SLM_MODEL_ID}/resolve/main/onnx/model_q4f16.onnx`, size: 300 }]
    await verifyModelCache()
    expect(isLocalAiEnabled()).toBe(true)
  })

  it('lựa chọn đã gạt được giữ nguyên, không theo cache', async () => {
    cacheEntries = [{ url: `https://huggingface.co/${LOCAL_SLM_MODEL_ID}/resolve/main/onnx/model_q4f16.onnx`, size: 300 }]
    await verifyModelCache()
    setLocalAiEnabled(false)
    expect(isLocalAiEnabled()).toBe(false)
  })

  it('verifyModelCache cộng dung lượng các file mô hình, bỏ qua file khác', async () => {
    cacheEntries = [
      { url: `https://huggingface.co/${LOCAL_SLM_MODEL_ID}/resolve/main/onnx/model_q4f16.onnx`, size: 300 },
      { url: `https://huggingface.co/${LOCAL_SLM_MODEL_ID}/resolve/main/tokenizer.json`, size: 9 },
      { url: 'https://example.com/other.onnx', size: 999 },
    ]
    expect(await verifyModelCache()).toEqual({ cached: true, bytes: 300 })
  })

  it('clearLocalAiCache xoá file mô hình và đặt lại TẮT', async () => {
    cacheEntries = [{ url: `https://huggingface.co/${LOCAL_SLM_MODEL_ID}/resolve/main/onnx/model_q4f16.onnx`, size: 300 }]
    setLocalAiEnabled(true)
    await clearLocalAiCache()
    expect(cacheEntries).toEqual([])
    expect(isLocalAiEnabled()).toBe(false)
  })

  it('xoá khoá Gemini cũ khi module được nạp', async () => {
    vi.resetModules()
    localStorage.setItem('fee-calculator.geminiApiKey', 'secret')
    localStorage.setItem('fee-calculator.geminiModel', 'gemini-x')
    await import('./localAiService')
    expect(localStorage.getItem('fee-calculator.geminiApiKey')).toBeNull()
    expect(localStorage.getItem('fee-calculator.geminiModel')).toBeNull()
  })
})

describe('readReceiptWithLocalAi', () => {
  it('mạng di động, mô hình chưa có và chưa xác nhận tải thì báo AI_MODEL_NOT_CACHED', async () => {
    vi.stubGlobal('navigator', { connection: { type: 'cellular' } })
    const error = await readReceiptWithLocalAi(hints).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PeopleError)
    expect((error as PeopleError).code).toBe('AI_MODEL_NOT_CACHED')
    expect(FakeWorker.instances).toHaveLength(0)
  })

  it('lượt đầu lệch tổng, lượt 2 khớp: trả về kết quả khớp và terminate worker', async () => {
    FakeWorker.generations = [mismatching, matching]
    const result = await readReceiptWithLocalAi(hints, { confirmedDownload: true })
    expect(result.rounds).toBe(2)
    expect(result.check.status).toBe('OK')
    expect(result.receipt.billTotal).toBe(50000)
    expect(FakeWorker.instances.every((w) => w.terminated)).toBe(true)
  })

  it('khớp ngay từ lượt đầu thì chỉ hỏi một lần', async () => {
    FakeWorker.generations = [matching]
    const result = await readReceiptWithLocalAi(hints, { confirmedDownload: true })
    expect(result.rounds).toBe(1)
    expect(FakeWorker.generations).toHaveLength(0)
  })

  it('worker báo lỗi bộ nhớ thì ném đúng mã lỗi và vẫn terminate worker', async () => {
    FakeWorker.generations = [{ error: { code: 'AI_OUT_OF_MEMORY', message: 'out of memory' } }]
    const error = await readReceiptWithLocalAi(hints, { confirmedDownload: true }).catch((e: unknown) => e)
    expect((error as PeopleError).code).toBe('AI_OUT_OF_MEMORY')
    expect(FakeWorker.instances.every((w) => w.terminated)).toBe(true)
  })

  it('mô hình trả về không phải JSON thì báo AI_FAILED', async () => {
    FakeWorker.generations = ['xin lỗi, tôi không đọc được']
    const error = await readReceiptWithLocalAi(hints, { confirmedDownload: true }).catch((e: unknown) => e)
    expect((error as PeopleError).code).toBe('AI_FAILED')
  })

  it('huỷ bằng signal thì ném OCR_CANCELLED và terminate worker', async () => {
    FakeWorker.generations = [matching]
    const controller = new AbortController()
    const pending = readReceiptWithLocalAi(hints, { confirmedDownload: true, signal: controller.signal }).catch((e: unknown) => e)
    controller.abort()
    const error = await pending
    expect((error as PeopleError).code).toBe('OCR_CANCELLED')
    expect(FakeWorker.instances.every((w) => w.terminated)).toBe(true)
  })
})
