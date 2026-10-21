import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'
import { needsBetterRead, validateReceipt } from './receiptValidation'

/** Lớp chữ của hoá đơn GTGT Grab (đã bỏ thông tin người mua): tên hàng xuống dòng trước dòng số, mã chuyến xuống dòng sau. */
const GRAB = `CÔNG TY TNHH GRAB
Địa chỉ (Address): Tòa nhà Mapletree Business Centre, 1060 Nguyễn Văn Linh, Phường Tân Hưng, TP. Hồ
Mã số thuế (Tax code): 0 3 1 2 6 5 0 4 3 7
HÓA ĐƠN GIÁ TRỊ GIA TĂNG
Ký hiệu (Serial): 1C26MAB
(VAT INVOICE)
Ngày (date) 01 tháng (month) 10 năm (year) 2026
Hình thức thanh toán (Payment method): TM/CK   Loại tiền (Currency): VND
Thành tiền
Thuế
STT   Tên hàng hóa, dịch vụ   ĐVT Số lượng Đơn giá   trước thuế Tiền thuế Thành tiền
suất
(No.)   (Description)   (Unit) (Quantity) (Unit Price)   (Amount exc (VAT amount) (Selling price)
(Tax rate)
VAT)
A   B   C   D   E   F   G=I/(1+F)   H=I-G   I
Cước phí vận chuyển mã A-
1   Chuyến   1   56.481 8%   56.481   4.519   61.000
9TCF6T2GW6FDAV
Chiết khấu mã A-
2   Chuyến   1   5.556 8%   5.556   444   6.000
9TCF6T2GW6FDAV
Phí dịch vụ mã A-
3   Chuyến   1   4.630 8%   4.630   370   5.000
9TCF6T2GW6FDAV
Điểm đi (From): Kinh, 829 Kinh Dương Vương, P.An Lạc, TP.Hồ Chí Minh, 70000, Vietnam
Biển kiểm soát phương tiện (No.Plate): 59V3-099.71
Trang 1/2
Tổng cộng số tiền đã có thuế GTGT:
60.000
(Total of VAT included selling price):
Số tiền viết bằng chữ (Amount in words): Sáu mươi nghìn đồng..
Tổng tiền trước thuế(TotalAmount exc VAT)8 %:   55.555 Tổng tiền thuế(Total of VatAmount)8 %   4.445
Tổng cộng số tiền trước thuế(Total of amount exc VAT):55.555 Tổng tiền thuế GTGT(Total of VAT amount):   4.445
Người mua hàng (Buyer)   Người bán hàng (Seller)`

/** Hoá đơn phòng nghỉ: giá trước thuế, VAT ghi ở chân bill; tên hàng có ngày và số phòng. */
const HOTEL = `KHÁCH SẠN SÔNG HÀN
Địa chỉ: 12 Bạch Đằng, Đà Nẵng
HÓA ĐƠN GIÁ TRỊ GIA TĂNG
Ngày 14 tháng 10 năm 2026
STT   Tên hàng hóa, dịch vụ   Đơn vị tính   Số lượng   Đơn giá   Thành tiền
(No.)   (Description)   (Unit)   (Quantity)   (Unit price)   (Amount)
1   2   3   4   5   6=4x5
1   Tiền phòng 1205 từ 12/10/2026 đến 14/10/2026   Đêm   2   1.200.000   2.400.000
2   Ăn sáng buffet   Suất   4   200.000   800.000
3   Giặt ủi   Lượt   1   150.000   150.000
4   Nước suối   Chai   6   20.000   120.000
Cộng tiền hàng (Sub total): 3.470.000
Thuế suất GTGT (VAT rate): 8%   Tiền thuế GTGT (VAT amount): 277.600
Tổng cộng tiền thanh toán (Total payment): 3.747.600
Số tiền viết bằng chữ: Ba triệu bảy trăm bốn mươi bảy nghìn sáu trăm đồng`

describe('hoá đơn GTGT dạng bảng', () => {
  it('Grab: đọc cước phí, phí dịch vụ, chiết khấu thành giảm giá; giá đã gồm thuế nên không cộng VAT', () => {
    const parsed = parseReceipt(GRAB)
    expect(parsed.vendorName).toBe('CÔNG TY TNHH GRAB')
    expect(parsed.invoiceDate).toBe('2026-10-01')
    expect(parsed.items).toEqual([
      { name: 'Cước phí vận chuyển', quantity: 1, unitPrice: 61_000, rawAmount: 61_000, uncertain: false },
      { name: 'Phí dịch vụ', quantity: 1, unitPrice: 5_000, rawAmount: 5_000, uncertain: false },
    ])
    expect(parsed.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 6_000 })
    expect(parsed.vat).toBeUndefined()
    expect(parsed.vatIncluded).toBe(true)
    expect(parsed.billTotal).toBe(60_000)
    expect(parsed.tableRows).toEqual({ expected: 3, read: 3, unread: [] })

    const check = validateReceipt(parsed, GRAB)
    expect(check.status).toBe('OK')
    expect(needsBetterRead(check)).toBe(false)
  })

  it('phòng nghỉ: giữ tên có ngày và số phòng, đủ 4 dòng, VAT ở chân bill khớp tổng', () => {
    const parsed = parseReceipt(HOTEL)
    expect(parsed.vendorName).toBe('KHÁCH SẠN SÔNG HÀN')
    expect(parsed.items.map((i) => [i.name, i.quantity, i.unitPrice, i.rawAmount])).toEqual([
      ['Tiền phòng 1205 từ 12/10/2026 đến 14/10/2026', 2, 1_200_000, 2_400_000],
      ['Ăn sáng buffet', 4, 200_000, 800_000],
      ['Giặt ủi', 1, 150_000, 150_000],
      ['Nước suối', 6, 20_000, 120_000],
    ])
    expect(parsed.billSubtotal).toBe(3_470_000)
    expect(parsed.vat).toEqual({ mode: 'FIXED_AMOUNT', value: 277_600 })
    expect(parsed.billTotal).toBe(3_747_600)
    expect(parsed.tableRows).toEqual({ expected: 4, read: 4, unread: [] })
    expect(validateReceipt(parsed, HOTEL).status).toBe('OK')
  })

  it('đếm dòng: dòng đánh số 3 hỏng thì báo thiếu món và gợi ý đọc lại', () => {
    const broken = HOTEL.replace('3   Giặt ủi   Lượt   1   150.000   150.000', '3   Giặt ủi   Lượt')
    const check = validateReceipt(parseReceipt(broken), broken)
    expect(check.missingRows?.length).toBe(1)
    expect(check.notes.join('\n')).toContain('thiếu món')
    expect(needsBetterRead(check)).toBe(true)
  })
})
