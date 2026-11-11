import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanUpLegacyLocalAi } from './legacyAiCleanup'

const LEGACY_KEYS = [
  'fee-calculator.useLocalAi',
  'fee-calculator.localAiCached',
  'fee-calculator.geminiApiKey',
  'fee-calculator.geminiModel',
]

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
    await cleanUpLegacyLocalAi()
    expect(remove).toHaveBeenCalledWith('transformers-cache')
  })

  it('xoá bốn khoá localStorage cũ và giữ khoá khác', async () => {
    setCaches({ delete: vi.fn().mockResolvedValue(true) })
    await cleanUpLegacyLocalAi()
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
    expect(localStorage.getItem('fee-calculator.keepMe')).toBe('y')
  })

  it('không ném lỗi khi trình duyệt không có caches', async () => {
    setCaches(undefined)
    await expect(cleanUpLegacyLocalAi()).resolves.toBeUndefined()
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })

  it('không ném lỗi khi caches.delete bị từ chối, và vẫn xoá localStorage', async () => {
    setCaches({ delete: vi.fn().mockRejectedValue(new Error('quota')) })
    await expect(cleanUpLegacyLocalAi()).resolves.toBeUndefined()
    LEGACY_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull())
  })
})
