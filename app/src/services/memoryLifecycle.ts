/*
 * Quản lý vòng đời RAM của các worker AI/OCR (architecture §5.2): mỗi worker đăng ký một hàm dọn,
 * và hàm dọn được gọi khi tác vụ xong, khi đóng form, hoặc khi app bị ẩn/đóng tab.
 * Chỉ `worker.terminate()` mới trả lại RAM/VRAM cho hệ điều hành, nên các cleaner phải terminate worker
 * và huỷ mọi promise đang chờ từ worker đó.
 */
import type { CleanupCallback } from './aiContracts'

/** Thời gian tối đa cho phép tác vụ AI chạy tiếp khi app đã bị ẩn xuống nền. */
export const MAX_BACKGROUND_GRACE_MS = 5_000

const cleaners = new Set<CleanupCallback>()
let activeJobs = 0
let bgTimer: ReturnType<typeof setTimeout> | undefined
let uninstallHooks: (() => void) | null = null

/** Đăng ký hàm dọn RAM của một worker; trả về hàm huỷ đăng ký. */
export function registerMemoryCleaner(cleaner: CleanupCallback): () => void {
  cleaners.add(cleaner)
  return () => {
    cleaners.delete(cleaner)
  }
}

/** Giải phóng tức thì mọi worker AI/OCR đang đăng ký. Lỗi của một cleaner không chặn các cleaner khác. */
export async function releaseAllAiMemory(): Promise<void> {
  clearTimeout(bgTimer)
  bgTimer = undefined
  await Promise.allSettled(Array.from(cleaners, async (cleaner) => cleaner()))
}

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

/**
 * Bao một tác vụ AI/OCR để theo dõi số tác vụ đang chạy. Khi tác vụ cuối cùng kết thúc,
 * giải phóng RAM nếu `eagerRelease` hoặc app đang ẩn. Lỗi của tác vụ được ném lại nguyên vẹn.
 */
export async function withAiMemoryScope<T>(task: () => Promise<T>, eagerRelease = true): Promise<T> {
  activeJobs++
  try {
    return await task()
  } finally {
    activeJobs = Math.max(0, activeJobs - 1)
    if (activeJobs === 0 && (eagerRelease || isHidden())) await releaseAllAiMemory()
  }
}

function onVisibilityChange() {
  clearTimeout(bgTimer)
  bgTimer = undefined
  if (!isHidden()) return
  if (activeJobs === 0) {
    void releaseAllAiMemory()
    return
  }
  // Đang quét dở: cho tối đa 5 giây; nếu người dùng vẫn chưa quay lại thì giải phóng để tránh iOS giết tab.
  bgTimer = setTimeout(() => void releaseAllAiMemory(), MAX_BACKGROUND_GRACE_MS)
}

function onPageHide() {
  void releaseAllAiMemory()
}

/**
 * Lắng nghe `visibilitychange` (ẩn app, chuyển app, khoá màn hình) và `pagehide` (đóng tab, điều hướng).
 * Gọi một lần khi app khởi động; trả về hàm gỡ bỏ listener. Gọi lại khi đã cài thì không làm gì thêm.
 */
export function installMemoryLifecycleHooks(): () => void {
  if (uninstallHooks) return uninstallHooks
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  uninstallHooks = () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onPageHide)
    clearTimeout(bgTimer)
    bgTimer = undefined
    uninstallHooks = null
  }
  return uninstallHooks
}
