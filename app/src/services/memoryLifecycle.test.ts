import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_BACKGROUND_GRACE_MS,
  installMemoryLifecycleHooks,
  registerMemoryCleaner,
  releaseAllAiMemory,
  withAiMemoryScope,
} from './memoryLifecycle'

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
  vi.useRealTimers()
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

describe('withAiMemoryScope', () => {
  it('giải phóng ngay khi tác vụ thành công', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    const result = await withAiMemoryScope(async () => 42)
    expect(result).toBe(42)
    expect(cleaner).toHaveBeenCalledTimes(1)
  })

  it('giải phóng cả khi tác vụ lỗi, và ném lại đúng lỗi', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    const failure = new Error('OCR lỗi')
    await expect(withAiMemoryScope(async () => Promise.reject(failure))).rejects.toBe(failure)
    expect(cleaner).toHaveBeenCalledTimes(1)
  })

  it('eagerRelease = false và app đang hiện thì không giải phóng', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    await withAiMemoryScope(async () => 'ok', false)
    expect(cleaner).not.toHaveBeenCalled()
  })

  it('không giải phóng khi vẫn còn tác vụ khác đang chạy', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    let finishSlow!: () => void
    const slow = withAiMemoryScope(() => new Promise<void>((resolve) => (finishSlow = resolve)))
    await withAiMemoryScope(async () => 'fast')
    expect(cleaner).not.toHaveBeenCalled()
    finishSlow()
    await slow
    expect(cleaner).toHaveBeenCalledTimes(1)
  })
})

describe('installMemoryLifecycleHooks', () => {
  it('app ẩn khi không có tác vụ nào thì giải phóng ngay', async () => {
    const cleaner = vi.fn()
    register(cleaner)
    setVisibility('hidden')
    await vi.waitFor(() => expect(cleaner).toHaveBeenCalledTimes(1))
  })

  it('app ẩn khi đang quét thì chờ 5 giây rồi mới giải phóng', async () => {
    vi.useFakeTimers()
    const cleaner = vi.fn()
    register(cleaner)
    let finish!: () => void
    const job = withAiMemoryScope(() => new Promise<void>((resolve) => (finish = resolve)), false)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(MAX_BACKGROUND_GRACE_MS - 1)
    expect(cleaner).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(cleaner).toHaveBeenCalledTimes(1)

    finish()
    await job
  })

  it('quay lại app trước khi hết 5 giây thì không giải phóng', async () => {
    vi.useFakeTimers()
    const cleaner = vi.fn()
    register(cleaner)
    let finish!: () => void
    const job = withAiMemoryScope(() => new Promise<void>((resolve) => (finish = resolve)), false)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(1_000)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(MAX_BACKGROUND_GRACE_MS)
    expect(cleaner).not.toHaveBeenCalled()

    finish()
    await job
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
