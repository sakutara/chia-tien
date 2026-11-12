import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'
import fixtures from './__fixtures__/fnbReceipts.json'
import { validateReceipt } from './receiptValidation'

/** Scenario của requirement "Đọc dòng món có số thứ tự đầu dòng và nghìn cách bằng khoảng trắng" (receipt-ocr). */
describe('Đọc dòng món có số thứ tự đầu dòng và nghìn cách bằng khoảng trắng', () => {
  it('một món có số thứ tự, số lượng, đơn giá và thành tiền', () => {
    const parsed = parseReceipt(
      [
        'TT Tên món SL Đ.Giá T.Tiền',
        '1 Caramel Machiato (Đá) (Nhỏ) 1 50 000 50 000',
      ].join('\n'),
    )
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'Caramel Machiato (Đá) (Nhỏ)',
      quantity: 1,
      unitPrice: 50000,
      rawAmount: 50000,
    })
  })

  it('nhiều món, số lượng lớn hơn 1', () => {
    const parsed = parseReceipt(
      ['TT Tên món SL Đ.Giá T.Tiền', '2 Bánh Mì Que 2 10 000 20 000'].join('\n'),
    )
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'Bánh Mì Que',
      quantity: 2,
      unitPrice: 10000,
      rawAmount: 20000,
    })
  })

  it('số thứ tự kèm dấu ngoặc', () => {
    const parsed = parseReceipt(['1) Nước ép dưa hấu 1 39,000 39,000'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'Nước ép dưa hấu',
      quantity: 1,
      unitPrice: 39000,
      rawAmount: 39000,
    })
  })

  it('số đầu dòng thuộc tên món khi bill không có cột số thứ tự', () => {
    const parsed = parseReceipt(['7 Up 1 15 000 15 000'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: '7 Up',
      quantity: 1,
      unitPrice: 15000,
      rawAmount: 15000,
    })
  })
})

/** Scenario của requirement "Đọc món hai dòng khi dòng dưới chỉ có số" (receipt-ocr). */
describe('Đọc món hai dòng khi dòng dưới chỉ có số', () => {
  it('dòng số gồm đơn giá, số lượng, thành tiền theo thứ tự bất kỳ', () => {
    const parsed = parseReceipt(['Trà chanh', '10,000 6 60,000'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'Trà chanh',
      quantity: 6,
      unitPrice: 10000,
      rawAmount: 60000,
    })
  })

  it('dòng số có dạng "SL x đơn giá thành tiền"', () => {
    const parsed = parseReceipt(['GOI GA-110', '1 x 110,000 110,000'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'GOI GA-110',
      quantity: 1,
      unitPrice: 110000,
      rawAmount: 110000,
    })
  })

  it('dòng dưới chỉ có đơn giá: không thành món riêng', () => {
    const parsed = parseReceipt(['Trà 2 12,000', '6,000'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'Trà',
      quantity: 2,
      unitPrice: 6000,
      rawAmount: 12000,
    })
  })

  it('dòng tiêu đề cột đứng ngay trên món đầu tiên không vào tên món', () => {
    const parsed = parseReceipt(['Mặt hàng SL Số tiền', 'Set 30 1 459,000'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({ name: 'Set 30' })
  })
})

/** Scenario của requirement "Nhận dòng tổng, tạm tính và tiền khách trả theo nhãn của quán ăn" (receipt-ocr). */
describe('Nhận dòng tổng, tạm tính và tiền khách trả theo nhãn của quán ăn', () => {
  it('bill chỉ có nhãn Thành tiền: đó là tổng bill', () => {
    const parsed = parseReceipt(['Cà phê sữa 1 25,000 25,000', 'Thành tiền: 25,000'].join('\n'))
    expect(parsed.billTotal).toBe(25000)
  })

  it('Thành tiền đứng trước giảm giá và Thanh toán: tiền hàng, giảm giá, tổng bill', () => {
    const parsed = parseReceipt(
      [
        'Trà đào 1 107,000 107,000',
        'Thành tiền: 107 000',
        '- Giảm giá: 6 000',
        'Thanh Toán 101000',
      ].join('\n'),
    )
    expect(parsed.billSubtotal).toBe(107000)
    expect(parsed.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 6000 })
    expect(parsed.billTotal).toBe(101000)
  })

  it('bill nhãn tiếng Anh: Sub Total là tiền hàng, Total là tổng bill, Cash không thành món', () => {
    const parsed = parseReceipt(
      ['Latte 1 64,000 64,000', 'Sub Total: 64,000', 'Total VND 64,000', 'Cash -64,000'].join('\n'),
    )
    expect(parsed.billSubtotal).toBe(64000)
    expect(parsed.billTotal).toBe(64000)
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({ name: 'Latte', rawAmount: 64000 })
  })

  it('dòng tiền khách đưa và tiền thừa không thành món và không đổi tổng bill', () => {
    const parsed = parseReceipt(
      ['Latte 1 64,000 64,000', 'Total VND 64,000', 'Tiền khách đưa 200,000', 'Tiền thừa: 116,000'].join('\n'),
    )
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({ name: 'Latte' })
    expect(parsed.billTotal).toBe(64000)
  })
})

/** Hồi quy: bill THE COFFEE HOUSE (tổng 52.000) có món thật trùng số với tổng và dòng "Thành tiên". */
describe('Hồi quy: món trùng số với tổng bill không bị bỏ (mcocr_public_145013rttzk)', () => {
  it('giữ đúng món Oolong 52.000, billTotal 52.000 và không UNVERIFIED', () => {
    const bill = (fixtures as Array<{ id: string; text: string }>).find((b) => b.id === 'mcocr_public_145013rttzk')
    expect(bill).toBeDefined()
    const parsed = parseReceipt(bill!.text)
    const check = validateReceipt(parsed, bill!.text)
    expect(check.receipt.billTotal).toBe(52000)
    const oolong = check.receipt.items.filter((item) => item.name.includes('Oolong'))
    expect(oolong).toHaveLength(1)
    expect(oolong[0].rawAmount).toBe(52000)
    expect(check.status).not.toBe('UNVERIFIED')
  })
})

/** Scenario của requirement "Đọc bill có hai dòng Tổng và làm tròn" và "Tính lại giảm giá theo phần trăm khi số tiền không khớp" (receipt-ocr). */
describe('Hai dòng Tổng, làm tròn gộp vào giảm giá, giảm giá tính lại từ phần trăm', () => {
  it('hai dòng Tổng: dòng đầu là tiền hàng, dòng sau là tổng bill', () => {
    const parsed = parseReceipt(
      ['Combo gà 1 495,000 495,000', 'Tổng 495,000', 'Giảm Giá (15%) -74,250', 'Làm tròn 250', 'Tổng 421,000'].join('\n'),
    )
    expect(parsed.billSubtotal).toBe(495000)
    expect(parsed.billTotal).toBe(421000)
  })

  it('làm tròn lên gộp vào giảm giá: giảm giá 74.000 và tổng các món trừ giảm giá đúng 421.000', () => {
    const text = ['Combo gà 1 495,000 495,000', 'Tổng 495,000', 'Giảm Giá (15%) -74,250', 'Làm tròn 250', 'Tổng 421,000'].join('\n')
    const parsed = parseReceipt(text)
    const check = validateReceipt(parsed, text)
    expect(check.receipt.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 74000 })
    const sum = check.receipt.items.reduce((s, item) => s + item.rawAmount, 0)
    expect(sum - (check.receipt.discount?.mode === 'FIXED_AMOUNT' ? check.receipt.discount.value : 0)).toBe(421000)
    expect(check.status).not.toBe('UNVERIFIED')
  })

  it('làm tròn khi không có giảm giá: làm tròn xuống -300 thành giảm giá 300, tổng 100.000', () => {
    const text = ['Cà phê 1 100,300 100,300', 'Tổng 100,300', 'Làm tròn -300', 'Tổng 100,000'].join('\n')
    const parsed = parseReceipt(text)
    const check = validateReceipt(parsed, text)
    expect(check.receipt.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 300 })
    const sum = check.receipt.items.reduce((s, item) => s + item.rawAmount, 0)
    expect(sum - 300).toBe(100000)
    expect(check.status).not.toBe('UNVERIFIED')
  })

  it('làm tròn lên khi không có giảm giá: không gộp vào giảm giá', () => {
    const text = ['Cà phê 1 100,300 100,300', 'Tổng 100,300', 'Làm tròn 200', 'Tổng 100,500'].join('\n')
    const parsed = parseReceipt(text)
    expect(parsed.discount).toBeUndefined()
  })

  it('số tiền giảm giá bị đọc sai một chữ số: tính lại từ 15% của tiền hàng, trạng thái CORRECTED', () => {
    const text = ['Combo gà 1 495,000 495,000', 'Giảm giá (15%) -44,250', 'Thanh toán 420,750'].join('\n')
    const parsed = parseReceipt(text)
    const check = validateReceipt(parsed, text)
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.discount).toEqual({ mode: 'FIXED_AMOUNT', value: 74250 })
    expect(check.notes.join('\n')).toContain('tính lại từ phần trăm')
  })
})

/** Scenario của requirement "Bỏ dòng tuỳ chọn không đồng và dòng bảng thuế khỏi danh sách món" (receipt-ocr). */
describe('Bỏ dòng tuỳ chọn không đồng và dòng bảng thuế khỏi danh sách món', () => {
  it('dòng tuỳ chọn 0 đồng dưới món không thành món và không làm mất món phía trên', () => {
    const parsed = parseReceipt(['cà phê sữa hạt dẻ (M) 1 19 000 19 000', '(MV) 0 19 000'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'cà phê sữa hạt dẻ (M)',
      quantity: 1,
      rawAmount: 19000,
    })
  })

  it('mã thuế suất một chữ cái sau thành tiền bị bỏ khỏi dòng món', () => {
    const parsed = parseReceipt(['Sua Chua Voi Trai Ca pha 64,000 B'].join('\n'))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      name: 'Sua Chua Voi Trai Ca pha',
      rawAmount: 64000,
    })
  })

  it('dòng bảng thuế dưới dòng tổng không thành món', () => {
    const text = [
      'Sua Chua Voi Trai Ca pha 1 64,000 64,000',
      'Tổng 64,000',
      'VAT% Net.Amt VAT Amount',
      'B 10 58,182 5,818 64,000',
    ].join('\n')
    const parsed = parseReceipt(text)
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({ name: 'Sua Chua Voi Trai Ca pha', rawAmount: 64000 })
  })
})
