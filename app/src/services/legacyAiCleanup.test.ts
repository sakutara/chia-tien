import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanUpLegacyLocalAi, LEGACY_CLEANUP_UNTIL } from './legacyAiCleanup'

const LEGACY_KEYS = ['fee-calculator.useLocalAi', 'fee-calculator.localAiCached', 'fee-calculator.geminiApiKey', 'fee-calculator.geminiModel']

/** Thời điểm cố định trước hạn chót, để test không phụ thuộc ngày chạy. */
const BEFORE_DEADLINE = new Date('2026-11-12T00:00:00Z')

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches')

function setCaches(value: unknown) {
  Object.defineProperty(globalThis, 'caches', { configurable: true, writable: true, value })
}

beforeEach(() => {
  localStorage.clear()
  LEGACY_KEYS.forEach((key) => localStorage.setItem(key, 'x'))
  localStorage.setItem('fee-calculator.keepMe', 'y')
})

afterEach(() => {
  if (originalCaches) Object.defineProperty(globalThis, 'caches', originalCaches)
  else delete (globalThis as { caches?: unknown }).caches
  vi.restoreAllMocks()
})

describe('cleanUpLegacyLocalAi', () => {
  it('xoá cache transformers-cache', async () => {
    const remove = vi.fn().mockResolvedValue(true)
    setCaches({ delete: remove })
    await cleanUpLegacyLocalAi(BEFORE_DEADLINE)
    expect(remove).toHaveBeenCalledWith('transformers-cache')
  })

  it('xoá bốn khoá localStorage cũ và giữ khoá khác', async () => {
    setCaches({ delete: vi.fn().mockResolvedValue(true) })
    await cleanUpLegacyLocalAi(BEFORE_DEADLINE)
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
    expect(localStorage.getItem('fee-calculator.keepMe')).toBe('y')
  })

  it('không ném lỗi khi trình duyệt không có caches', async () => {
    setCaches(undefined)
    await expect(cleanUpLegacyLocalAi(BEFORE_DEADLINE)).resolves.toBeUndefined()
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })

  it('không ném lỗi khi caches.delete bị từ chối, và vẫn xoá localStorage', async () => {
    setCaches({ delete: vi.fn().mockRejectedValue(new Error('quota')) })
    await expect(cleanUpLegacyLocalAi(BEFORE_DEADLINE)).resolves.toBeUndefined()
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })

  it('dọn trước hạn chót', async () => {
    const remove = vi.fn().mockResolvedValue(true)
    setCaches({ delete: remove })
    await cleanUpLegacyLocalAi(new Date('2027-02-11T23:59:59Z'))
    expect(remove).toHaveBeenCalledWith('transformers-cache')
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })

  it('vẫn dọn đúng ngày hạn chót', async () => {
    const remove = vi.fn().mockResolvedValue(true)
    setCaches({ delete: remove })
    await cleanUpLegacyLocalAi(new Date(`${LEGACY_CLEANUP_UNTIL}T12:00:00Z`))
    expect(remove).toHaveBeenCalledWith('transformers-cache')
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })

  it('không làm gì sau hạn chót', async () => {
    const remove = vi.fn().mockResolvedValue(true)
    setCaches({ delete: remove })
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    await cleanUpLegacyLocalAi(new Date('2027-02-13T00:00:00Z'))
    expect(remove).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBe('x'))
  })
})
