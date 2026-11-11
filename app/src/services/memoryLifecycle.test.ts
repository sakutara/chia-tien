import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installMemoryLifecycleHooks, registerMemoryCleaner, releaseAllAiMemory } from './memoryLifecycle'

let visibility: 'visible' | 'hidden' = 'visible'
const unregisters: Array<() => void> = []
let uninstall: (() => void) | undefined

/** Đăng ký cleaner và tự gỡ sau mỗi test để không rò rỉ sang test khác. */
function register(cleaner: () => void) {
  unregisters.push(registerMemoryCleaner(cleaner))
  return cleaner
}

function setVisibility(state: 'visible' | 'hidden') {
  visibility = state
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  uninstall = installMemoryLifecycleHooks()
})

afterEach(() => {
  unregisters.splice(0).forEach((fn) => fn())
  uninstall?.()
  uninstall = undefined
  visibility = 'visible'
})

describe('registerMemoryCleaner và releaseAllAiMemory', () => {
  it('giải phóng gọi mọi cleaner đang đăng ký', async () => {
    const a = vi.fn()
    const b = vi.fn()
    register(a)
    register(b)
    await releaseAllAiMemory()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('cleaner đã huỷ đăng ký không bị gọi', async () => {
    const a = vi.fn()
    const unregister = registerMemoryCleaner(a)
    unregister()
    await releaseAllAiMemory()
    expect(a).not.toHaveBeenCalled()
  })

  it('cleaner lỗi (kể cả ném lỗi đồng bộ) không chặn các cleaner khác', async () => {
    const good = vi.fn()
    register(() => {
      throw new Error('worker đã chết')
    })
    register(good)
    await expect(releaseAllAiMemory()).resolves.toBeUndefined()
    expect(good).toHaveBeenCalledTimes(1)
  })
})

describe('installMemoryLifecycleHooks', () => {
  it('app ẩn khi không có tác vụ nào thì giải phóng ngay', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    setVisibility('hidden')
    await vi.waitFor(() => expect(cleaner).toHaveBeenCalledTimes(1))
  })

  it('pagehide giải phóng ngay', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    window.dispatchEvent(new Event('pagehide'))
    await vi.waitFor(() => expect(cleaner).toHaveBeenCalledTimes(1))
  })

  it('gỡ bỏ listener thì không còn phản ứng với sự kiện', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    uninstall?.()
    uninstall = undefined
    setVisibility('hidden')
    window.dispatchEvent(new Event('pagehide'))
    await Promise.resolve()
    expect(cleaner).not.toHaveBeenCalled()
  })

  it('gọi lại khi đã cài thì trả về cùng hàm gỡ, không đăng ký trùng', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    const again = installMemoryLifecycleHooks()
    expect(again).toBe(installMemoryLifecycleHooks())
    setVisibility('hidden')
    await vi.waitFor(() => expect(cleaner).toHaveBeenCalledTimes(1))
  })
})
