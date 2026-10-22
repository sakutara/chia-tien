import { describe, expect, it } from 'vitest'
import { RECEIPT_FIXTURES } from './__fixtures__/receipts'
import { parseReceipt } from './receiptParser'

describe('parseReceipt — bộ bill mẫu', () => {
  it.each(RECEIPT_FIXTURES.map((f) => [f.name, f] as const))('%s', (_name, fixture) => {
    const parsed = parseReceipt(fixture.text)
    expect(parsed).toEqual(fixture.expected)
  })

  it('đối chiếu được: tổng các món khớp tổng bill ở bill không lỗi', () => {
    const cafe = RECEIPT_FIXTURES.find((f) => f.name.startsWith('cafe, '))!.expected
    const subtotal = cafe.items.reduce((s, it) => s + it.rawAmount, 0)
    expect(subtotal).toBe(120_000)
    expect(cafe.billTotal).toBe(122_472)
  })
})

describe('parseReceipt — OCR không đọc đúng dấu tiếng Việt', () => {
  const stripMarks = (t: string) => t.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  it.each(RECEIPT_FIXTURES.map((f) => [f.name, f] as const))('%s: vẫn cho ra cùng số liệu', (_name, fixture) => {
    const parsed = parseReceipt(stripMarks(fixture.text))
    expect(parsed.items.map((i) => [i.quantity, i.unitPrice, i.rawAmount, i.uncertain])).toEqual(
      fixture.expected.items.map((i) => [i.quantity, i.unitPrice, i.rawAmount, i.uncertain]),
    )
    expect(parsed.billTotal).toBe(fixture.expected.billTotal)
    expect(parsed.vat).toEqual(fixture.expected.vat)
    expect(parsed.discount).toEqual(fixture.expected.discount)
    expect(parsed.service).toEqual(fixture.expected.service)
  })
})

describe('parseReceipt — trường hợp biên', () => {
  it('tên, SL x đơn giá = thành tiền trên cùng một dòng (bố cục OCR thực tế)', () => {
    const parsed = parseReceipt('LAU BO GO NGOC\nLau bo my 2 x 150.000 = 300.000\nBia Tiger 330ml 10 x 25.000 = 250.000\nTong cong 550.000')
    expect(parsed.items).toEqual([
      { name: 'Lau bo my', quantity: 2, unitPrice: 150_000, rawAmount: 300_000, uncertain: false },
      { name: 'Bia Tiger 330ml', quantity: 10, unitPrice: 25_000, rawAmount: 250_000, uncertain: false },
    ])
  })

  it('văn bản rỗng không ném lỗi và không có gì để điền', () => {
    expect(parseReceipt('')).toEqual({ items: [] })
    expect(parseReceipt('   \n  \n')).toEqual({ items: [] })
  })

  it('ngày không có thật (30/02) bị bỏ, không điền bừa', () => {
    expect(parseReceipt('Quán A\n30/02/2026')).not.toHaveProperty('invoiceDate')
  })

  it('ngày năm 2 chữ số được hiểu là 20xx', () => {
    expect(parseReceipt('Quán A\n05/07/26').invoiceDate).toBe('2026-07-05')
  })

  it('bỏ dòng địa chỉ và điện thoại khỏi tên quán và danh sách món', () => {
    const parsed = parseReceipt('Địa chỉ 12 Lê Lợi 150.000\nSĐT 0909 111 222\nNhà hàng Sen Việt\nCơm chiên 1 60.000 60.000')
    expect(parsed.vendorName).toBe('Nhà hàng Sen Việt')
    expect(parsed.items.map((i) => i.name)).toEqual(['Cơm chiên'])
  })

  it('khi bill ghi cả % và số tiền cho VAT thì ưu tiên số tiền (R-14)', () => {
    const parsed = parseReceipt('Quán B\nCơm 1 50.000 50.000\nVAT 10% 5.000\nTổng cộng 55.000')
    expect(parsed.vat).toEqual({ mode: 'FIXED_AMOUNT', value: 5_000 })
  })

  it('VAT chỉ có % thì lấy phần trăm', () => {
    const parsed = parseReceipt('Quán B\nCơm 1 50.000 50.000\nVAT 10%\nTổng cộng 50.000')
    expect(parsed.vat).toEqual({ mode: 'PERCENTAGE', value: 10 })
  })

  it('không đọc được số tiền thì không đoán: bỏ trống thay vì điền 0', () => {
    const parsed = parseReceipt('Quán C\nPhí phục vụ 5%\nTổng cộng xxx')
    expect(parsed.service).toEqual({ mode: 'PERCENTAGE', value: 5 })
    expect(parsed).not.toHaveProperty('billTotal')
  })
})

describe('parseReceipt — đếm cột tiền trước, rồi suy ra đơn giá / SL / tên', () => {
  const one = (line: string) => parseReceipt(`QUÁN TEST\n${line}`).items

  it('1 số: thành tiền, SL 1', () => {
    expect(one('Gà nướng 150.000')).toMatchObject([{ name: 'Gà nướng', quantity: 1, unitPrice: 150_000, rawAmount: 150_000 }])
  })

  it('2 số có dấu x: đơn giá và thành tiền, SL suy ra', () => {
    expect(one('Trà đào 35.000 x 70.000')).toMatchObject([{ name: 'Trà đào', quantity: 2, unitPrice: 35_000, rawAmount: 70_000, uncertain: false }])
  })

  it('2 số, số đầu nhỏ: SL và thành tiền, đơn giá suy ra, đánh dấu xem lại', () => {
    expect(one('Bia Tiger 3 75.000')).toMatchObject([{ name: 'Bia Tiger', quantity: 3, unitPrice: 25_000, rawAmount: 75_000, uncertain: true }])
  })

  it('2 số, số đầu nhỏ nhưng không chia hết: số đó thuộc về tên món', () => {
    expect(one('Combo 7 55.000')).toMatchObject([{ name: 'Combo 7', quantity: 1, unitPrice: 55_000, rawAmount: 55_000 }])
  })

  it('3 số theo cả hai thứ tự: SL × đơn giá và đơn giá × SL', () => {
    expect(one('Cơm chiên 2 45.000 90.000')).toMatchObject([{ quantity: 2, unitPrice: 45_000, rawAmount: 90_000, uncertain: false }])
    expect(one('Cơm chiên 45.000 x 2 90.000')).toMatchObject([{ quantity: 2, unitPrice: 45_000, rawAmount: 90_000, uncertain: false }])
  })

  it('nhóm nghìn bị tách bằng khoảng trắng được gộp lại', () => {
    expect(one('Lẩu thái 1 250 000')).toMatchObject([{ name: 'Lẩu thái', quantity: 1, unitPrice: 1_250_000, rawAmount: 1_250_000 }])
    expect(one('Cà phê 29 000 x 2 58 000')).toMatchObject([{ name: 'Cà phê', quantity: 2, unitPrice: 29_000, rawAmount: 58_000 }])
  })

  it('hai số tiền đứng liền không có SL: suy SL từ thương, không chia hết thì đánh dấu', () => {
    expect(one('Nem 20.000 50.000')).toMatchObject([{ quantity: 1, unitPrice: 20_000, rawAmount: 50_000, uncertain: true }])
  })
})

describe('parseReceipt — tên món không chứa số lớn', () => {
  it('số tiền lọt vào tên bị bỏ khỏi tên (hai dòng: tên kèm số, dòng sau là SL x đơn giá)', () => {
    const [item] = parseReceipt('QUÁN TEST\nBia Tiger 25.000\n10 x 25.000 = 250.000').items
    expect(item.name).toBe('Bia Tiger')
    expect(item).toMatchObject({ quantity: 10, unitPrice: 25_000, rawAmount: 250_000 })
    expect(item.uncertain).toBe(true)
  })

  it('dùng số lớn trong tên để sửa đơn giá khi nó làm SL × đơn giá khớp thành tiền', () => {
    const [item] = parseReceipt('QUÁN TEST\nBia Tiger 25.000 10 x 28.000 = 250.000').items
    expect(item.name).toBe('Bia Tiger')
    expect(item.unitPrice).toBe(25_000)
  })

  it('số nhỏ và mã hàng vẫn là một phần của tên', () => {
    expect(parseReceipt('QUÁN TEST\nBia Tiger 330ml 2 x 25.000 = 50.000').items[0].name).toBe('Bia Tiger 330ml')
    expect(parseReceipt('QUÁN TEST\nCombo 2 người 199.000').items[0].name).toBe('Combo 2 người')
  })
})

describe('parseReceipt — bỏ dòng rác OCR (vùng mã QR, đường kẻ)', () => {
  it('chuỗi chữ số và token rác không thành món', () => {
    const text = 'QUÁN TEST\nCơm 1 x 45.000 = 45.000\n440010 7009.0000 NGÔ 6000 00 c0g need 2401 l0) 5055640020066 FURS 240.966'
    expect(parseReceipt(text).items.map((i) => i.name)).toEqual(['Cơm'])
  })
})

describe('parseReceipt — hoá đơn điện tử dạng bảng', () => {
  const text = RECEIPT_FIXTURES.find((f) => f.name.startsWith('hoá đơn điện tử'))!.text

  it('"12.374,00" (đồng kèm phần thập phân) và "12.37400" (mất dấu phẩy) đều đọc ra 12.374', () => {
    expect(parseReceipt(text.replace('12.37400', '12.374,00')).discount).toEqual({ mode: 'FIXED_AMOUNT', value: 12_374 })
    expect(parseReceipt(text).discount).toEqual({ mode: 'FIXED_AMOUNT', value: 12_374 })
  })

  it('mã số thuế không bị hiểu là VAT, dòng chữ ký sau tổng không thành món', () => {
    const parsed = parseReceipt(text)
    expect(parsed.vat).toBeUndefined()
    expect(parsed.items).toHaveLength(6)
  })

  it('ngày "Ngày (date) 13 tháng (month) 10 năm (year) 2026" đọc được kể cả khi ngoặc bị OCR làm hỏng', () => {
    expect(parseReceipt('Ngày (date) 13 tháng (month) 10 năm (year) 2026').invoiceDate).toBe('2026-10-13')
    expect(parseReceipt('Ngày (date) Í 3 tháng (month) 10 năm (ear/2026').invoiceDate).toBe('2026-10-13')
  })

  it('tên quán lấy từ dòng "Đơn vị bán hàng", kể cả khi nhãn bị OCR làm mất dấu hai chấm', () => {
    expect(parseReceipt('HÓA ĐƠN BÁN HÀNG\nĐơn vị bán hàng (Con       NHÀ KHACH THANG LỢI\nMã số thuế: 1600852713').vendorName).toBe('NHÀ KHACH THANG LỢI')
  })
})

describe('bill tính riêng đồ uống và đồ ăn', () => {
  it('giữ hai dòng tổng nhóm làm hai món và không nhầm với tổng bill', () => {
    const r = parseReceipt(['Quán ABC', 'Tổng giá đồ uống: 120.000', 'Tổng giá đồ ăn: 300.000', 'Tổng cộng 420.000'].join('\n'))
    expect(r.items.map((i) => [i.name, i.rawAmount])).toEqual([
      ['Tổng đồ uống', 120000],
      ['Tổng đồ ăn', 300000],
    ])
    expect(r.billTotal).toBe(420000)
  })

  it('bill liệt kê món lẻ khớp tổng nhóm thì giữ món lẻ, không tính trùng', () => {
    const r = parseReceipt(['Cà phê 2 x 30.000 = 60.000', 'Phở bò 1 x 60.000 = 60.000', 'Tổng đồ uống 60.000', 'Tổng đồ ăn 60.000', 'Tổng cộng 120.000'].join('\n'))
    expect(r.items.map((i) => i.name)).toEqual(['Cà phê', 'Phở bò'])
  })
})

describe('bill nhóm Food / Drink', () => {
  it('nhận tiêu đề tiếng Anh, "Soft drink" là món thường không phải nhóm', () => {
    const r = parseReceipt(['Drink 120.000đ', 'Food 300.000đ', 'Tổng cộng 420.000đ'].join('\n'))
    expect(r.items.map((i) => [i.name, i.rawAmount])).toEqual([['Tổng đồ uống', 120000], ['Tổng đồ ăn', 300000]])
    const soft = parseReceipt('Soft drink 2 x 20.000 = 40.000')
    expect(soft.items.map((i) => i.name)).toEqual(['Soft drink'])
  })
})

describe('đơn từ app giao đồ ăn (ảnh chụp màn hình)', () => {
  const OCR = [
    '8:34 0 @@ 4 ta ull ull É 531%',
    '<— Chi tiết đơn hang @)',
    'Tom tat don hang',
    '-. 1x Cà phê sữa 25.000đ',
    '© Ghi chú: Thảo',
    '-. 1x Cà phê sữa 33.000đ',
    'Size L',
    '© Ghi chú: Ít sữa - Tuyển',
    'là. 1x Sữa tươi cà phê 26.000đ',
    'Pi 1x Cacao sữa kem muối 35.000đ',
    '© Ghi chú: C.Trâm',
    'Thu gọn',
    'Phí giao hàng (2.5 km) 16.000đ',
    'Phí áp dụng @ 3.000đ',
    'Giảm giá -35.910đ',
    '172.090đ',
  ].join('\n')

  it('đọc món có hậu tố đ và tiền tố "1x", bỏ ghi chú/size, gộp phí giao hàng vào phí', () => {
    const r = parseReceipt(OCR)
    expect(r.items.map((i) => [i.name, i.quantity, i.rawAmount])).toEqual([
      ['Cà phê sữa', 1, 25000],
      ['Cà phê sữa', 1, 33000],
      ['Sữa tươi cà phê', 1, 26000],
      ['Cacao sữa kem muối', 1, 35000],
    ])
    expect(r.service).toEqual({ mode: 'FIXED_AMOUNT', value: 19000 })
    expect(r.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 35910 })
  })
})

describe('parseReceipt — tên món chỉ giữ tối đa 4 chữ số ở cuối', () => {
  it('số tối đa 4 chữ số ở cuối tên được giữ', () => {
    const [item] = parseReceipt('QUÁN TEST\nBia 1964 1 x 25.000 = 25.000').items
    expect(item.name).toBe('Bia 1964')
  })

  it('số hơn 4 chữ số ở cuối tên bị bỏ hết, không cắt bớt', () => {
    const [item] = parseReceipt('QUÁN TEST\nBia 123456 1 x 25.000 = 25.000').items
    expect(item.name).toBe('Bia')
  })
})
