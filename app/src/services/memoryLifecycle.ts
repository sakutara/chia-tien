/*
 * Quản lý vòng đời RAM của các worker OCR: mỗi worker đăng ký một hàm dọn,
 * và hàm dọn được gọi khi form đóng, hoặc khi app bị ẩn/đóng tab.
 * Chỉ `worker.terminate()` mới trả lại RAM cho hệ điều hành, nên các cleaner phải terminate worker
 * và huỷ mọi promise đang chờ từ worker đó.
 */
import type { CleanupCallback } from './workerContracts'

const cleaners = new Set<CleanupCallback>()
let uninstallHooks: (() => void) | null = null

/** Đăng ký hàm dọn RAM của một worker; trả về hàm huỷ đăng ký. */
export function registerMemoryCleaner(cleaner: CleanupCallback): () => void {
  cleaners.add(cleaner)
  return () => {
    cleaners.delete(cleaner)
  }
}

/** Giải phóng tức thì mọi worker OCR đang đăng ký. Lỗi của một cleaner không chặn các cleaner khác. */
export async function releaseWorkerMemory(): Promise<void> {
  await Promise.allSettled(Array.from(cleaners, async (cleaner) => cleaner()))
}

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function onVisibilityChange() {
  if (isHidden()) void releaseWorkerMemory()
}

function onPageHide() {
  void releaseWorkerMemory()
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
    uninstallHooks = null
  }
  return uninstallHooks
}
