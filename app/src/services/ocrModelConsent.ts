/*
 * Trạng thái đồng ý tải bộ đọc chữ (VietOCR, khoảng 110 MB) trước lần quét đầu tiên.
 * - `chia-tien.ocrModelReady` (localStorage): đã tải xong một lần trên máy này, các lần sau không hỏi nữa.
 * - Đồng ý trong phiên (sessionStorage): đã bấm "Tải và quét" trong tab này thì không hỏi lại dù mô hình chưa tải xong.
 * Mọi truy cập storage bọc try/catch: private mode hoặc storage bị chặn thì coi như chưa sẵn sàng.
 */

const READY_KEY = 'chia-tien.ocrModelReady'
const SESSION_KEY = 'chia-tien.ocrModelConsentSession'

/** Kích thước xấp xỉ của bộ đọc chữ, hiển thị trong hộp thoại xác nhận. */
export const OCR_MODEL_SIZE_MB = 110

export function isOcrModelReady(): boolean {
  try {
    return window.localStorage.getItem(READY_KEY) === '1'
  } catch {
    return false
  }
}

export function markOcrModelReady(): void {
  try {
    window.localStorage.setItem(READY_KEY, '1')
  } catch {
    // Private mode: lần sau sẽ hỏi lại, không sao.
  }
}

export function hasSessionOcrConsent(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function grantSessionOcrConsent(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Không lưu được: lần quét sau sẽ hỏi lại.
  }
}
