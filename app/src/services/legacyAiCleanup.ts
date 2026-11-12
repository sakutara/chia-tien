/*
 * Dọn dữ liệu của tính năng AI trên máy đã bị gỡ: cache mô hình (~480–790 MB) và các khoá localStorage cũ.
 * Chạy một lần khi khởi động; mọi lỗi (kể cả trình duyệt chặn storage) được nuốt để không chặn app.
 */

/** Cache Storage mà thư viện transformers.js từng dùng để giữ trọng số mô hình. */
const LEGACY_CACHE_NAME = 'transformers-cache'

/** Các khoá localStorage của tính năng AI và Gemini cũ. */
const LEGACY_STORAGE_KEYS = ['fee-calculator.useLocalAi', 'fee-calculator.localAiCached', 'fee-calculator.geminiApiKey', 'fee-calculator.geminiModel'] as const

/**
 * Hạn chót (theo ngày UTC, dạng YYYY-MM-DD) của bước dọn dữ liệu AI cũ.
 * Sau ngày này có thể xoá hẳn tệp này và lời gọi trong main.tsx.
 */
export const LEGACY_CLEANUP_UNTIL = '2027-02-12'

/**
 * Xoá cache mô hình AI cũ và các khoá localStorage liên quan. Không ném lỗi.
 * Sau hạn LEGACY_CLEANUP_UNTIL thì không làm gì. Tham số `now` chỉ để kiểm thử.
 */
export async function cleanUpLegacyLocalAi(now: Date = new Date()): Promise<void> {
  // So chuỗi YYYY-MM-DD theo UTC là đúng thứ tự thời gian.
  if (now.toISOString().slice(0, 10) > LEGACY_CLEANUP_UNTIL) return
  try {
    if (typeof caches !== 'undefined') await caches.delete(LEGACY_CACHE_NAME)
  } catch {
    // Cache Storage lỗi hoặc bị chặn: bỏ qua, lần khởi động sau sẽ thử lại.
  }
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Private mode có thể chặn localStorage: bỏ qua từng khoá.
    }
  }
}
