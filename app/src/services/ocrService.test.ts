import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PeopleError } from './peopleErrors'

const recognize = vi.fn()
const terminate = vi.fn(async () => undefined)
const setParameters = vi.fn(async (_params: Record<string, string>) => undefined)
const createWorker = vi.fn(async (..._args: unknown[]) => ({ recognize, terminate, setParameters }))

vi.mock('tesseract.js', () => ({ createWorker: (...args: unknown[]) => createWorker(...args) }))
vi.mock('../lib/imagePreprocess', () => ({ prepareForOcr: vi.fn(async (b: Blob) => b) }))

import { runOcr, terminateOcrWorker } from './ocrService'

const img = (name: string) => new Blob([name], { type: 'image/png' })

describe('runOcr', () => {
  beforeEach(async () => {
    recognize.mockReset()
    terminate.mockClear()
    setParameters.mockClear()
    createWorker.mockClear()
    await terminateOcrWorker()
  })

  afterEach(async () => {
    await terminateOcrWorker()
  })

  it('quét lần lượt từng ảnh và trả về văn bản theo thứ tự', async () => {
    recognize.mockResolvedValueOnce({ data: { text: 'trang 1' } }).mockResolvedValueOnce({ data: { text: 'trang 2' } })
    const texts = await runOcr([img('a'), img('b')])
    expect(texts).toEqual(['trang 1', 'trang 2'])
    expect(createWorker).toHaveBeenCalledWith(['vie', 'eng'], undefined, expect.objectContaining({ gzip: false }))
  })

  it('đặt chế độ phân trang một cột khi tạo worker', async () => {
    recognize.mockResolvedValue({ data: { text: 'x' } })
    await runOcr([new Blob(['a'])])
    expect(setParameters).toHaveBeenCalledWith(expect.objectContaining({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' }))
  })

  it('dùng lại worker giữa các lần quét', async () => {
    recognize.mockResolvedValue({ data: { text: 'x' } })
    await runOcr([img('a')])
    await runOcr([img('b')])
    expect(createWorker).toHaveBeenCalledTimes(1)
  })

  it('huỷ giữa chừng thì dừng worker và báo OCR_CANCELLED', async () => {
    const controller = new AbortController()
    recognize.mockImplementation(async () => {
      controller.abort()
      return { data: { text: 'ignored' } }
    })
    await expect(runOcr([img('a'), img('b')], { signal: controller.signal })).rejects.toMatchObject({
      code: 'OCR_CANCELLED',
    })
    expect(terminate).toHaveBeenCalled()
    expect(recognize).toHaveBeenCalledTimes(1)
  })

  it('lỗi đọc thì báo OCR_FAILED với thông báo cho người dùng', async () => {
    recognize.mockRejectedValueOnce(new Error('wasm lỗi'))
    const err = await runOcr([img('a')]).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(PeopleError)
    expect((err as PeopleError).code).toBe('OCR_FAILED')
    expect((err as PeopleError).message).toMatch(/nhập tay/)
  })

  it('báo tiến trình theo từng ảnh', async () => {
    recognize.mockResolvedValue({ data: { text: 'x' } })
    const onProgress = vi.fn()
    await runOcr([img('a'), img('b')], { onProgress })
    expect(onProgress).toHaveBeenLastCalledWith(100, 'Xong')
  })
})
