import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OcrWord } from '../domain/ocrLayout'
import type { VietOcrWorkerRequest, VietOcrWorkerResponse } from './aiContracts'

vi.mock('../lib/imagePreprocess', () => ({ prepareForOcr: vi.fn(async (b: Blob) => b) }))

/** Dòng trả về cho mỗi ảnh; một ảnh = một phần tử. Không có thì worker trả về lỗi. */
let results: OcrWord[][] = []
let failNextRecognize = false

class FakeWorker {
  static instances: FakeWorker[] = []
  terminated = false
  initBaseUrl: string | undefined
  private listeners = new Map<string, Set<(event: { data: VietOcrWorkerResponse }) => void>>()

  constructor() {
    FakeWorker.instances.push(this)
  }

  addEventListener(type: string, fn: (event: { data: VietOcrWorkerResponse }) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)?.add(fn)
  }

  removeEventListener(type: string, fn: (event: { data: VietOcrWorkerResponse }) => void) {
    this.listeners.get(type)?.delete(fn)
  }

  postMessage(request: VietOcrWorkerRequest) {
    queueMicrotask(() => {
      if (this.terminated) return
      const reply = (data: VietOcrWorkerResponse) => this.listeners.get('message')?.forEach((fn) => fn({ data }))
      if (request.type === 'INIT') {
        this.initBaseUrl = request.baseUrl
        reply({ type: 'READY', requestId: request.requestId })
        return
      }
      if (failNextRecognize) {
        failNextRecognize = false
        reply({ type: 'ERROR', requestId: request.requestId, message: 'boom' })
        return
      }
      reply({ type: 'PROGRESS', requestId: request.requestId, percent: 50 })
      reply({ type: 'RESULT', requestId: request.requestId, lines: results.shift() ?? [] })
    })
  }

  terminate() {
    this.terminated = true
  }
}

const word = (text: string, x0: number, y0: number): OcrWord => ({ text, x0, y0, x1: x0 + 40, y1: y0 + 20 })
const img = (name: string) => new Blob([name], { type: 'image/png' })

vi.stubGlobal('Worker', FakeWorker)

import { runOcr, terminateOcrWorker } from './ocrService'

beforeEach(() => {
  FakeWorker.instances = []
  results = []
  failNextRecognize = false
})

afterEach(() => {
  terminateOcrWorker()
  vi.useRealTimers()
})

describe('runOcr (VietOCR)', () => {
  it('quét lần lượt từng ảnh và ghép từng dòng thành văn bản', async () => {
    results = [
      [word('Bún', 10, 100), word('50.000', 300, 100), word('Chả', 10, 140), word('40.000', 300, 140)],
      [word('Tổng', 10, 100), word('90.000', 300, 100)],
    ]
    const texts = await runOcr([img('a'), img('b')])
    expect(texts).toEqual(['Bún  50.000\nChả  40.000', 'Tổng  90.000'])
  })

  it('dùng lại một worker giữa các lần quét', async () => {
    results = [[word('a', 0, 0)], [word('b', 0, 0)]]
    await runOcr([img('a')])
    await runOcr([img('b')])
    expect(FakeWorker.instances).toHaveLength(1)
  })

  it('báo tiến trình theo từng ảnh', async () => {
    results = [[word('a', 0, 0)]]
    const progress: number[] = []
    await runOcr([img('a')], { onProgress: (percent) => progress.push(percent) })
    expect(progress).toContain(50)
    expect(progress.at(-1)).toBe(100)
  })

  it('huỷ giữa chừng thì dừng worker và báo OCR_CANCELLED', async () => {
    const controller = new AbortController()
    results = [[word('a', 0, 0)], [word('b', 0, 0)]]
    const pending = runOcr([img('a'), img('b')], { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: 'OCR_CANCELLED' })
    expect(FakeWorker.instances.every((w) => w.terminated)).toBe(true)
  })

  it('worker báo lỗi thì ném OCR_FAILED để người dùng nhập tay', async () => {
    failNextRecognize = true
    await expect(runOcr([img('a')])).rejects.toMatchObject({ code: 'OCR_FAILED' })
  })

  it('rảnh 15 giây thì tự dừng worker', async () => {
    vi.useFakeTimers()
    results = [[word('a', 0, 0)]]
    await runOcr([img('a')])
    const worker = FakeWorker.instances[0]
    expect(worker.terminated).toBe(false)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(worker.terminated).toBe(true)
  })

  it('hẹn giờ rảnh của lần quét trước không tắt worker giữa lần quét sau', async () => {
    vi.useFakeTimers()
    results = [[word('a', 0, 0)], [word('b', 0, 0)]]
    await runOcr([img('a')])
    await vi.advanceTimersByTimeAsync(14_000)
    await runOcr([img('b')])
    // Đã quá 15 giây kể từ lần quét đầu nhưng mới 2 giây kể từ lần quét thứ hai.
    await vi.advanceTimersByTimeAsync(2_000)
    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0].terminated).toBe(false)
  })

  it('gửi cho worker gốc URL tuyệt đối (bản deploy build với base tương đối)', async () => {
    results = [[word('a', 0, 0)]]
    await runOcr([img('a')])
    expect(FakeWorker.instances[0].initBaseUrl).toMatch(/^https?:\/\/.+\/$/)
  })

  it('terminateOcrWorker dừng worker đang sống', async () => {
    results = [[word('a', 0, 0)]]
    await runOcr([img('a')])
    terminateOcrWorker()
    expect(FakeWorker.instances[0].terminated).toBe(true)
  })
})
