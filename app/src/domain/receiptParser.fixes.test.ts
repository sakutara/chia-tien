import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'
import { validateReceipt } from './receiptValidation'

// Bill OCR thật (văn bản nguyên gốc, không rút gọn) cho các Scenario của spec receipt-ocr:
// "Loại số điện thoại và mã quầy khỏi số tiền", "Nhận khuyến mãi và tiền khách đưa tiếng Anh",
// "Món có số lượng đứng cuối tên".

const BILL_SPRITE = `VIM4 ANH 690 Trần Phú
Số 590 Trần Phú, P. Cảm Thủy
Vincommerce TP. Cầm Phả, Quảng Ninh
024.71066368-43581
HÓA ƠN BÁN HÀNG
Ngày bán: 15/08/2020 10:00 H:00133753
Quầy:001  NVBH: 09020497
Mặt hàng  ơn giá SL T. Tiển
Nước giải khát h.chanh Sprite chai 390m1
8935049510680  7.000 1  7.000
TỔNG TIẾN PHẢI T. TOÁN  7.000
TỔNG TIỀN Ã GIẢM  0
TIỀN KHÁCH TRẢ  7.000
TIỀN MÃT  7.000
TIỀN TRẢ LẠI  0
(Giá đã bao gồm thuế gtgt)
chỉ xuất hóa đơn trong ngày
Tax invoice will be issued with A same day
CÁM ÔN QUÝ KHÁCH VÀ HỆN GẮP LAI
Hot line: 02471066060 mà tiến cáp lai t. com`

const BILL_REDBULL = `VINT QNH SỐ 463 TỔ 66 Khu Diêm Thủy
T  Số 463, Tổ 86, Khu Diêm Thủy
Vincommerce P. Cảm Đông, TP. Cảm Phả
02471066866- 33761
HÓA ƠN BẤN HÀNG
Ngày bán: 15/08/2020 06:07 H:00023821
Quầy::001  NVBH:09026650
Mặt hàng  ơn giá SL T. Tiển
Nước uống tăng lực Redbu11 T24 10nx250m1
8935112200005  9.200 1 9.200
KM  -400
TỔNG TIỂN PHẢI T. TOÁN  8.800
TỔNG TIỀN Ã GIẢM  400
TIẾN KHÁCH TRẢ  8.800
TIỀN MẶT  8.800
TIẾN TRẢ LẠI  0
(Giá đã bao gồm thuế gtgt)
chỉ xuất hóa đơn trong ngày
Tax invoice will be issued within same day
CÁM ƠN QUÝ KHÁCH VÀ HỆN GẶP LẠI
Hot line: 02471066866 Website: vinnart.com`

const BILL_FRUIT = `scepter
Cafe CJ Bui Iding
CJ Bui Iding, 6 Le Thanh Ton Street,
Ben Nghe Ward, Dist.1, HCM City
Telephone: 028.3824.8844
TOUS ITS JOURS GIAO HANG TAN NOI TAI
Grabfood, Delivery Now, Baemin & GoFood
POS:01?02038057  08/12/2020 09:23
Fruit Garden Fresh 1  420,000
SUBTOTAL  420,000
TOTAL  420,000
CASH  420,000
RECEIVED  500,000
CHANGE  80,000
HHOA DON CO GIA TRI TRONG NGAY
[Free wifi Pw: everyday]
Cashier Name Cafe Ci`

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

describe('receiptParser — sửa lỗi OCR theo spec receipt-ocr', () => {
  it('dòng "02471066866- 33761" không thành món và 33761 không là số tiền', () => {
    const parsed = parseReceipt(BILL_REDBULL)
    expect(parsed.items.some((item) => item.rawAmount === 33761)).toBe(false)
    expect(parsed.items.some((item) => item.name.includes('02471066866'))).toBe(false)
  })

  it('dòng "Quầy:001  NVBH: 09020497" không thành món', () => {
    const parsed = parseReceipt(BILL_SPRITE)
    expect(parsed.items.some((item) => /quay|nvbh/.test(fold(item.name)))).toBe(false)
    expect(parsed.items.some((item) => item.rawAmount === 9020497 || item.rawAmount === 1)).toBe(false)
  })

  it('KM -400 và "TỔNG TIỀN Ã GIẢM 400": giảm 400, tổng bill 8.800', () => {
    const parsed = parseReceipt(BILL_REDBULL)
    expect(parsed.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 400 })
    expect(parsed.billTotal).toBe(8800)
    const check = validateReceipt(parsed, BILL_REDBULL)
    expect(['OK', 'CORRECTED']).toContain(check.status)
  })

  it('RECEIVED và CHANGE không thành món; "Fruit Garden Fresh 1 420,000" là SL 1, thành tiền 420.000', () => {
    const parsed = parseReceipt(BILL_FRUIT)
    expect(parsed.items.some((item) => /received|change/.test(fold(item.name)))).toBe(false)
    expect(parsed.items.some((item) => item.rawAmount === 500000 || item.rawAmount === 80000)).toBe(false)
    const fruitItem = parsed.items.find((item) => item.name.startsWith('Fruit Garden Fresh'))
    expect(fruitItem).toBeDefined()
    expect(fruitItem?.name).toBe('Fruit Garden Fresh')
    expect(fruitItem?.quantity).toBe(1)
    expect(fruitItem?.rawAmount).toBe(420000)
  })
})

// Spec receipt-ocr, requirement "Tổng bill khi dòng số dư cuối bằng 0": dòng cuối là số còn phải trả.
describe('Tổng bill khi dòng số dư cuối', () => {
  const BILL_ITEMS = `Cà phê sữa 1 25,000 25,000
Bánh mì 2 15,000 30,000
`

  it('Còn phải thu bằng 0 sau thanh toán: tổng bill là số của dòng Tổng thanh toán ngay phía trên', () => {
    const parsed = parseReceipt(`${BILL_ITEMS}Tổng thanh toán 55,000
Còn phải thu 0`)
    expect(parsed.billTotal).toBe(55000)
  })

  it('Còn lại khác 0: quy tắc cũ được giữ, không đổi tổng bill', () => {
    const parsed = parseReceipt(`${BILL_ITEMS}Tổng thanh toán 55,000
Còn lại 20,000`)
    expect(parsed.billTotal).toBe(55000)
  })
})
