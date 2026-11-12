import { describe, expect, it } from 'vitest'
import { parseReceipt, type ParsedItem } from './receiptParser'

/*
 * Hoá đơn tổng hợp (tên quán bịa, văn bản OCR giả lập) phủ các bố cục chung. Kỳ vọng tính tay từ bố cục, không lấy từ
 * kết quả parser. Không có luật nào gắn với một quán cụ thể ở đây.
 */

/** Đối chiếu: tổng các món bằng dòng tổng bill. */
const sumOf = (items: ParsedItem[]): number => items.reduce((s, i) => s + i.rawAmount, 0)

describe('bố cục món chung', () => {
  it('(1) tên – SL – đơn giá – thành tiền trên một dòng', () => {
    const parsed = parseReceipt(`QUÁN ÁNH DƯƠNG
Tên món SL Đơn giá Thành tiền
Phở bò tái 2 45.000 90.000
Cà phê sữa đá 1 25.000 25.000
Tổng cộng 115.000`)
    expect(parsed.items).toEqual([
      { name: 'Phở bò tái', quantity: 2, unitPrice: 45_000, rawAmount: 90_000, uncertain: false },
      { name: 'Cà phê sữa đá', quantity: 1, unitPrice: 25_000, rawAmount: 25_000, uncertain: false },
    ])
    expect(parsed.billTotal).toBe(115_000)
    expect(sumOf(parsed.items)).toBe(parsed.billTotal)
  })

  it('(2) số lượng đứng trước tên: "2x Phở bò 90.000"', () => {
    const parsed = parseReceipt(`QUÁN ÁNH DƯƠNG
2x Phở bò 90.000
1x Trà đào 25.000
Tổng cộng 115.000`)
    expect(parsed.items).toEqual([
      { name: 'Phở bò', quantity: 2, unitPrice: 45_000, rawAmount: 90_000, uncertain: false },
      { name: 'Trà đào', quantity: 1, unitPrice: 25_000, rawAmount: 25_000, uncertain: false },
    ])
    expect(parsed.billTotal).toBe(115_000)
  })

  it('(3) tên một dòng, "SL x đơn giá = thành tiền" ở dòng dưới', () => {
    const parsed = parseReceipt(`QUÁN ÁNH DƯƠNG
Gà nướng muối ớt
1 x 120.000 = 120.000
Gỏi cuốn
2 x 30.000 = 60.000
Tổng cộng 180.000`)
    expect(parsed.items).toEqual([
      { name: 'Gà nướng muối ớt', quantity: 1, unitPrice: 120_000, rawAmount: 120_000, uncertain: false },
      { name: 'Gỏi cuốn', quantity: 2, unitPrice: 30_000, rawAmount: 60_000, uncertain: false },
    ])
    expect(sumOf(parsed.items)).toBe(parsed.billTotal)
  })

  it('(4) chỉ có tên và thành tiền: SL 1', () => {
    const parsed = parseReceipt(`QUÁN MÂY XANH
Bò lúc lắc 135.000
Nước suối 15.000
Tổng cộng 150.000`)
    expect(parsed.items).toEqual([
      { name: 'Bò lúc lắc', quantity: 1, unitPrice: 135_000, rawAmount: 135_000, uncertain: false },
      { name: 'Nước suối', quantity: 1, unitPrice: 15_000, rawAmount: 15_000, uncertain: false },
    ])
    expect(sumOf(parsed.items)).toBe(parsed.billTotal)
  })

  it('(5) tiền viết 45k / 45,000 / 45.000 đều đọc ra 45.000', () => {
    const parsed = parseReceipt(`QUÁN NHÀ BÈ
Bún bò Huế 45k
Chả giò 2 x 45,000 = 90,000
Nem nướng 45.000
Tổng cộng 180.000`)
    expect(parsed.items).toEqual([
      { name: 'Bún bò Huế', quantity: 1, unitPrice: 45_000, rawAmount: 45_000, uncertain: false },
      { name: 'Chả giò', quantity: 2, unitPrice: 45_000, rawAmount: 90_000, uncertain: false },
      { name: 'Nem nướng', quantity: 1, unitPrice: 45_000, rawAmount: 45_000, uncertain: false },
    ])
    expect(sumOf(parsed.items)).toBe(parsed.billTotal)
  })
})

describe('giảm giá, phí, VAT', () => {
  it('(6a) giảm giá theo phần trăm, tiền hàng và tổng bill được đọc riêng', () => {
    const parsed = parseReceipt(`QUÁN BÌNH MINH
Bún riêu 1 50.000 50.000
Bún bò 1 40.000 40.000
Tổng tiền hàng 90.000
Giảm giá 10%
Tổng cộng 81.000`)
    expect(parsed.discount).toEqual({ mode: 'PERCENTAGE', value: 10 })
    expect(parsed.billSubtotal).toBe(90_000)
    expect(parsed.billTotal).toBe(81_000)
    expect(sumOf(parsed.items)).toBe(parsed.billSubtotal)
  })

  it('(6b) giảm giá ghi bằng số tiền', () => {
    const parsed = parseReceipt(`QUÁN BÌNH MINH
Bún riêu 1 50.000 50.000
Bún bò 1 40.000 40.000
Khuyến mãi 5.000
Tổng cộng 85.000`)
    expect(parsed.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 5_000 })
    expect(parsed.billTotal).toBe(85_000)
    expect(parsed.items).toHaveLength(2)
  })

  it('(7a) phí phục vụ 5% và VAT 8%', () => {
    const parsed = parseReceipt(`NHÀ HÀNG BIỂN XANH
Lẩu hải sản 1 350.000 350.000
Tổng tiền hàng 350.000
Phí phục vụ 5%
VAT 8%
Tổng cộng 396.900`)
    expect(parsed.service).toEqual({ mode: 'PERCENTAGE', value: 5 })
    expect(parsed.vat).toEqual({ mode: 'PERCENTAGE', value: 8 })
    expect(parsed.billSubtotal).toBe(350_000)
    expect(parsed.billTotal).toBe(396_900)
  })

  it('(7b) phí phục vụ 5% và VAT 10%', () => {
    const parsed = parseReceipt(`NHÀ HÀNG BIỂN XANH
Lẩu hải sản 1 350.000 350.000
Tổng tiền hàng 350.000
Phí phục vụ 5%
VAT 10%
Tổng cộng 404.250`)
    expect(parsed.service).toEqual({ mode: 'PERCENTAGE', value: 5 })
    expect(parsed.vat).toEqual({ mode: 'PERCENTAGE', value: 10 })
    expect(parsed.billTotal).toBe(404_250)
  })
})

describe('hoá đơn tiếng Anh', () => {
  it('(8) Subtotal, Service charge, VAT, Total', () => {
    const parsed = parseReceipt(`Restaurant Lotus Garden
Date: 12/04/2026
Item Qty Price Amount
Pho Bo 2 45,000 90,000
Iced Tea 1 25,000 25,000
Subtotal 115,000
Service charge 5%
VAT 10%
Total 132,825`)
    expect(parsed.vendorName).toBe('Restaurant Lotus Garden')
    expect(parsed.invoiceDate).toBe('2026-04-12')
    expect(parsed.items).toEqual([
      { name: 'Pho Bo', quantity: 2, unitPrice: 45_000, rawAmount: 90_000, uncertain: false },
      { name: 'Iced Tea', quantity: 1, unitPrice: 25_000, rawAmount: 25_000, uncertain: false },
    ])
    expect(parsed.billSubtotal).toBe(115_000)
    expect(parsed.service).toEqual({ mode: 'PERCENTAGE', value: 5 })
    expect(parsed.vat).toEqual({ mode: 'PERCENTAGE', value: 10 })
    expect(parsed.billTotal).toBe(132_825)
  })
})

describe('dòng nhiễu và dòng ghi chú', () => {
  it('(9) địa chỉ, điện thoại, MST, số bàn, giờ vào/ra, lời cảm ơn, wifi không thành món', () => {
    const parsed = parseReceipt(`QUÁN CƠM NIÊU GIA
Địa chỉ: 45 Nguyễn Trãi, Quận 5, TP.HCM
SĐT: 028 3838 1234
MST: 0312345678
Hóa đơn bán hàng
Số bàn: 12
Giờ vào: 18:05  Giờ ra: 19:20
Cơm gà xối mỡ 1 65.000 65.000
Canh chua 1 40.000 40.000
Tổng cộng 105.000
Wifi: QUANCOM / pass 88888888
Cảm ơn quý khách, hẹn gặp lại!`)
    expect(parsed.vendorName).toBe('QUÁN CƠM NIÊU GIA')
    expect(parsed.items.map((i) => i.name)).toEqual(['Cơm gà xối mỡ', 'Canh chua'])
    expect(parsed.billTotal).toBe(105_000)
  })

  it('(10) dòng ghi chú của món và dòng gạch ngăn không thành món', () => {
    const parsed = parseReceipt(`TRÀ SỮA MOCHI
-----------------------
Trà sữa trân châu 1 35.000 35.000
Ghi chú: ít đá
-----------------------
Bánh flan 2 15.000 30.000
Ghi chú: ít ngọt
-----------------------
Tổng cộng 65.000`)
    expect(parsed.items).toEqual([
      { name: 'Trà sữa trân châu', quantity: 1, unitPrice: 35_000, rawAmount: 35_000, uncertain: false },
      { name: 'Bánh flan', quantity: 2, unitPrice: 15_000, rawAmount: 30_000, uncertain: false },
    ])
    expect(sumOf(parsed.items)).toBe(parsed.billTotal)
  })
})
