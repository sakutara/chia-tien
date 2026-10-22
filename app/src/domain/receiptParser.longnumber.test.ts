import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'

/** Bill Bún Ốc Sườn Cô Sáu (ảnh 3): MST, số hoá đơn, số tài khoản là số dài lẻ, không phải tiền hay món (02 §3 bước 5, BR-4.19). */
const BUN_OC = [
  'HO KINH DOANH BUN OC SUON CO SAU',
  'MST: 001070016165',
  '01070016165',
  'SO: 2506041166',
  'Bún Ốc Lẫn 2 53.000 106.000',
  'Bún Ốc Nhỏ + Sườn 1 53.000 53.000',
  'Thêm riêu 1 11.000 11.000',
  'Khăn 3 2.000 6.000',
  'Tổng thanh toán 176.000đ',
  '888803155678',
].join('\n')

describe('số dài lẻ không phải tiền hay món', () => {
  it('MST, số hoá đơn và số tài khoản không thành món; các món và tổng vẫn đọc đúng', () => {
    const parsed = parseReceipt(BUN_OC)
    expect(parsed.items.map((i) => [i.name, i.rawAmount])).toEqual([
      ['Bún Ốc Lẫn', 106_000],
      ['Bún Ốc Nhỏ + Sườn', 53_000],
      ['Thêm riêu', 11_000],
      ['Khăn', 6_000],
    ])
    expect(parsed.billTotal).toBe(176_000)
  })

  it('số dài chia hết cho 100 vẫn là tiền', () => {
    const parsed = parseReceipt(['Quán test', 'Bia 12 x 25.000 = 300.000', 'Tổng cộng 12345600'].join('\n'))
    expect(parsed.billTotal).toBe(12_345_600)
  })
})
