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

// Văn bản VietOCR thật (bill chụp bằng điện thoại, tháng 10/2026): các lỗi đọc đặc trưng của VietOCR.
describe('bill đọc bằng VietOCR', () => {
  const items = (text: string) => parseReceipt(text).items.map((i) => [i.name, i.quantity, i.unitPrice, i.rawAmount])

  it('dấu "=" bị đọc thành ký tự lạ hoặc mất, dấu "x" bị mất (C.TAO)', () => {
    const text = [
      'C.TAO - Chinese Restaurant',
      'PHIẾU TẠM TÍNH',
      'Ngày in  30/10/2026 - 12:56',
      'Hàng hóa SL  Đ.Giá T.TIÊN',
      'Khăn Lạnh 3 x  5,000 5  15,000',
      'Mì Kéo Hài Sàn',
      '1 x 125,000 F  125,000',
      'Mì Kéo Hoành Thánh Xá Xíu',
      '2 x 105,000 5  210,000',
      'Mi Kéo Vịt Quay',
      '1 105,000 F  105,000',
      'Xíu Mại Tồm Thịt Nấm Hương 3 Viên',
      '1 x  85,000  85,000',
      'Tổng số lương:  8',
      'Tổng tiền:  540,000',
      'VAT 8%:  43,2000',
      'Thanh toán:  583,200',
    ].join('\n')
    expect(items(text)).toEqual([
      ['Khăn Lạnh', 3, 5_000, 15_000],
      ['Mì Kéo Hài Sàn', 1, 125_000, 125_000],
      ['Mì Kéo Hoành Thánh Xá Xíu', 2, 105_000, 210_000],
      ['Mi Kéo Vịt Quay', 1, 105_000, 105_000],
      ['Xíu Mại Tồm Thịt Nấm Hương 3 Viên', 1, 85_000, 85_000],
    ])
    expect(parseReceipt(text).billTotal).toBe(583_200)
  })

  it('không sửa "=" khi hai số tiền đứng liền nhau không có SL ("290,000 — 290,000")', () => {
    expect(items('Thịt vai 1 — 290,000 — 290,000\nTổng cộng 290,000')).toEqual([['Thịt vai', 1, 290_000, 290_000]])
  })

  it('bỏ dòng tuỳ chọn không giá và dòng món 0 đồng, không ghép vào tên món khác (Every Half, Matchandeul)', () => {
    const text = [
      'STT  Tên món  SL Đơn giá Thành tiền',
      '1 Cà Phê (Latte.Meii Milk)  1 65,000 65,000',
      '- Hot 30 Meji  11  0  a',
      '2 Cà Phê (Americano) 1 55,000 55,000',
      '- Lạnh/Coid  1  o  ol',
      'Banchan thịt (GDJ) Ch)  4  0  0',
      'Thịt vai (At)  1 290,000 290,000',
      'Tổng tiền:  410,000',
    ].join('\n')
    expect(parseReceipt(text).items.map((i) => i.rawAmount)).toEqual([65_000, 55_000, 290_000])
    expect(parseReceipt(text).items.every((i) => !/Hot|Lạnh|Banchan/.test(i.name))).toBe(true)
  })

  it('dòng đủ SL × đơn giá = thành tiền vẫn là món dù tên lẫn chữ giống từ khoá ("BAN", "The")', () => {
    const text = ['Thịt vai (BAN)  1 290,000 290,000', 'Ba chỉ heo mông nước ương Chương The 1 310,000 310,000', 'TỔNG CỘNG (GRAND TOTAL) 600,000'].join('\n')
    expect(parseReceipt(text).items.map((i) => i.rawAmount)).toEqual([290_000, 310_000])
  })

  it('thành tiền nhoè chỉ còn "000": lấy SL × đơn giá và đánh dấu cần xem lại (Hito Sushi)', () => {
    const parsed = parseReceipt(['Tên món  SL  ĐG Thành tiền', '1.SALMON  3  99.000  000', 'SASHIMI', '2.TUNA SASHIMI 1  99.000  99.000', 'Tổng thanh toán  396.000'].join('\n'))
    expect(parsed.items.map((i) => i.rawAmount)).toEqual([297_000, 99_000])
    expect(parsed.items[0].uncertain).toBe(true)
  })
})
