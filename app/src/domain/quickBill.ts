import { isYmdInRange } from '../lib/dates'
import type { ReceiptCheck } from './receiptValidation'

/*
 * Quy tắc của luồng "Chụp bill tạo bữa nhanh" (capability quick-bill-capture). Hàm thuần.
 */

/**
 * Bill đã đọc khớp thì hoá đơn được lưu thẳng, không qua form: có món, tổng các món đã khớp tổng ghi trên bill
 * (`OK`, hoặc `CORRECTED` sau khi tự sửa số) và không còn dòng hàng nào chưa đọc được.
 */
export function canAutoSaveReceipt(check: Pick<ReceiptCheck, 'status' | 'receipt' | 'missingRows'>): boolean {
  if (check.status !== 'OK' && check.status !== 'CORRECTED') return false
  if (check.receipt.items.length === 0) return false
  return (check.missingRows?.length ?? 0) === 0
}

/** Ngày của bữa tạo nhanh: ngày trên bill nếu hợp lệ trong khoảng cho phép, không thì hôm nay. */
export function quickMealDate(billDate: string | undefined, today: string): string {
  return billDate && isYmdInRange(billDate) ? billDate : today
}
