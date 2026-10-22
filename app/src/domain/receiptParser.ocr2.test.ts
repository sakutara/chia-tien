import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'
import { oneFourVariants, validateReceipt } from './receiptValidation'

/** Văn bản OCR thật của bill Bún Ốc Sườn Cô Sáu (ảnh 3) sau lượt 2 đọc lại số. */
const BUN_OC_OCR = [
  "64.",
  "HOtling A4 K300- Tân Binh",
  "0s",
  "5.1168.640 - oa 2594.0798",
  "HÓA ĐƠN",
  "NGÀY: tạo. 84: 2506041166",
  "Ban: oạ, WE '42 SA - 0808 SA)",
  "SL kKhach: 4",
  "Phuc Via:",
  "Thu ngân: Thu Be",
  "In — aril",
  "——",
  "| # Tén mén %",
  "i §",
  "Ee 21. N L DG KM TT",
  "TE a a eee re +----~- +-------===== tr 2c\" +",
  "-.... BUN Oc Lan __ 2| 53.000 08.009",
  "Bún ÓcNhò+ |. T ng + ]",
  "sa Sườn 1 53.000 53.000",
  "iT hee Sa ee -+--=-=========“= ope te pawns anaes 1",
  "3 Thêm riéu 1 41.000 41,000",
  "(in gee rer ter thendin xe nẽenenannsnn==.== Se gleaned ee a a ae ee + PERSONS SO \"",
  "4 |Khăn 3 2.000 6.000",
  "Tiền hàng 176.000",
  "Tổng thanh toán 176.000",
  "Còn phải thu 176.000",
  "Trân trọng cảm ơn!",
  "VIETIN - HO KINH DOANH BUN OC SUON CO SAU - |",
  "pm 888803155678",
].join('\n')

describe('bill Bún Ốc (ảnh 3): OCR lượt 2 và đối soát 1 ↔ 4', () => {
  it('tổng bill đọc đúng 176.000 và số hoá đơn / MST không thành món', () => {
    const parsed = parseReceipt(BUN_OC_OCR)
    expect(parsed.billTotal).toBe(176_000)
    expect(parsed.items.some((i) => i.rawAmount === 2_506_041_166 || i.rawAmount === 1_070_016_165)).toBe(false)
  })

  it('đối soát sửa "Thêm riêu" từ 41.000 về 11.000 (1 ↔ 4) và đạt tổng 176.000', () => {
    const check = validateReceipt(parseReceipt(BUN_OC_OCR), BUN_OC_OCR)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.items.reduce((s, i) => s + i.rawAmount, 0)).toBe(176_000)
    expect(check.receipt.items.map((i) => i.rawAmount)).toEqual([106_000, 53_000, 11_000, 6_000])
  })
})

describe('chuẩn hoá dòng OCR (02 §3 bước 0)', () => {
  it('ký tự viền bảng quanh số không làm mất dòng món', () => {
    const parsed = parseReceipt(['Quán test', '-..| Bún Ốc Lẫn 2| 53.000 106.000]'].join('\n'))
    expect(parsed.items.map((i) => [i.name, i.rawAmount])).toEqual([['Bún Ốc Lẫn', 106_000]])
  })

  it('"đ" bị đọc thành chữ số thừa: 176.0004 → 176.000, và nhãn "Téng thanh toán" vẫn là dòng tổng', () => {
    const parsed = parseReceipt(['Quán test', 'Téng thanh toán 176.0004'].join('\n'))
    expect(parsed.billTotal).toBe(176_000)
  })

  it('nhiều dòng tổng: lấy số xuất hiện nhiều nhất', () => {
    const parsed = parseReceipt(['Quán test', 'Tiền hàng 176.000đ', 'Tổng thanh toán 476.000đ', 'Còn phải thu 176.000đ'].join('\n'))
    expect(parsed.billTotal).toBe(176_000)
  })
})

describe('biến thể 1 ↔ 4', () => {
  it('đổi 1 hoặc 2 chữ số 1/4, không trả số gốc', () => {
    expect(oneFourVariants(476_000)).toContain(176_000)
    expect(oneFourVariants(476_000)).not.toContain(476_000)
    expect(oneFourVariants(2_000)).toEqual([])
  })
})
