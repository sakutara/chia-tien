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
