import type { ConnectionKind } from '../services/aiContracts'

/** Phần của Network Information API mà app dùng; iOS Safari không có API này. */
interface NetworkInformationLike {
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown'
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  saveData?: boolean
}

/** Phát hiện loại kết nối mạng hiện tại của thiết bị. */
export function detectConnectionKind(): ConnectionKind {
  const nav = globalThis.navigator as
    | (Navigator & {
        connection?: NetworkInformationLike
        mozConnection?: NetworkInformationLike
        webkitConnection?: NetworkInformationLike
      })
    | undefined

  const conn = nav?.connection ?? nav?.mozConnection ?? nav?.webkitConnection
  if (!conn) return 'unknown' // iOS Safari & một số trình duyệt desktop không mở API này

  // Chế độ tiết kiệm dữ liệu ở cấp OS: coi như đang dùng mạng di động.
  if (conn.saveData === true) return 'cellular'

  if (conn.type === 'wifi' || conn.type === 'ethernet') return 'wifi'
  if (conn.type === 'cellular' || conn.type === 'wimax') return 'cellular'

  return 'unknown'
}

/**
 * Có cần hiện hộp thoại nhắc Wi-Fi và nút "Tiếp tục" trước khi tải model (~320 MB) không:
 * - Model đã có trong Cache: không tải nên không hỏi.
 * - Đang chắc chắn dùng Wi-Fi / Ethernet: tự tải, không hỏi.
 * - Mạng di động, hoặc không xác định được (iOS Safari): hỏi.
 */
export function shouldConfirmModelDownload(isCached: boolean): boolean {
  if (isCached) return false
  return detectConnectionKind() !== 'wifi'
}
