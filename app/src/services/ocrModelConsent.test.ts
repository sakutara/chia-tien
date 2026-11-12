import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OCR_MODEL_SIZE_MB, grantSessionOcrConsent, hasSessionOcrConsent, isOcrModelReady, markOcrModelReady } from './ocrModelConsent'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ocrModelConsent', () => {
  it('ước lượng kích thước bộ đọc chữ là 110 MB', () => {
    expect(OCR_MODEL_SIZE_MB).toBe(110)
  })

  it('chưa đánh dấu thì chưa sẵn sàng; đánh dấu rồi thì sẵn sàng', () => {
    expect(isOcrModelReady()).toBe(false)
    markOcrModelReady()
    expect(isOcrModelReady()).toBe(true)
    expect(localStorage.getItem('chia-tien.ocrModelReady')).not.toBeNull()
  })

  it('localStorage ném lỗi (private mode): đọc trả về chưa sẵn sàng, ghi không ném ra ngoài', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(isOcrModelReady()).toBe(false)
    expect(() => markOcrModelReady()).not.toThrow()
  })

  it('đồng ý trong phiên: ghi và đọc lại; sessionStorage lỗi thì coi như chưa đồng ý', () => {
    expect(hasSessionOcrConsent()).toBe(false)
    grantSessionOcrConsent()
    expect(hasSessionOcrConsent()).toBe(true)

    sessionStorage.clear()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => grantSessionOcrConsent()).not.toThrow()
    expect(hasSessionOcrConsent()).toBe(false)
  })
})
