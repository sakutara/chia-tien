import { describe, expect, it } from 'vitest'
import { canAutoSaveReceipt, quickMealDate } from './quickBill'
import type { ParsedReceipt } from './receiptParser'
import type { ReceiptCheckStatus } from './receiptValidation'

const item = { name: 'Phở', quantity: 1, unitPrice: 50000, rawAmount: 50000 }
const check = (status: ReceiptCheckStatus, items = [item], missingRows?: string[]) => ({
  status,
  receipt: { items } as unknown as ParsedReceipt,
  missingRows,
})

describe('canAutoSaveReceipt', () => {
  it('tự lưu khi OK hoặc CORRECTED, có món, không thiếu dòng', () => {
    expect(canAutoSaveReceipt(check('OK'))).toBe(true)
    expect(canAutoSaveReceipt(check('CORRECTED'))).toBe(true)
    expect(canAutoSaveReceipt(check('OK', [item], []))).toBe(true)
  })

  it('mở form khi MISMATCH hoặc UNVERIFIED', () => {
    expect(canAutoSaveReceipt(check('MISMATCH'))).toBe(false)
    expect(canAutoSaveReceipt(check('UNVERIFIED'))).toBe(false)
  })

  it('mở form khi không có món hoặc còn dòng hàng thiếu', () => {
    expect(canAutoSaveReceipt(check('OK', []))).toBe(false)
    expect(canAutoSaveReceipt(check('OK', [item], ['3 Bún chả']))).toBe(false)
  })
})

describe('quickMealDate', () => {
  it('lấy ngày trên bill khi hợp lệ', () => {
    expect(quickMealDate('2026-03-05', '2026-11-17')).toBe('2026-03-05')
  })

  it('dùng hôm nay khi bill không có ngày, ngày không có thật hoặc ngoài khoảng', () => {
    expect(quickMealDate(undefined, '2026-11-17')).toBe('2026-11-17')
    expect(quickMealDate('2026-02-30', '2026-11-17')).toBe('2026-11-17')
    expect(quickMealDate('1999-12-31', '2026-11-17')).toBe('2026-11-17')
  })
})
