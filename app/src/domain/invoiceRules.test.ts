import { describe, expect, it } from 'vitest'
import { PeopleError } from '../services/peopleErrors'
import {
  computeInvoice,
  countUnassignedItems,
  normalizeItemConsumers,
  previewItemConsumerShares,
  resolveSplitType,
  validateEqualSplit,
  type InvoiceRulesDraft,
} from './invoiceRules'

const none = { mode: 'NONE' as const, value: 0 }
const pct = (value: number) => ({ mode: 'PERCENTAGE' as const, value })
const fixed = (value: number) => ({ mode: 'FIXED_AMOUNT' as const, value })

function itemized(overrides: Partial<InvoiceRulesDraft> = {}): InvoiceRulesDraft {
  return {
    inputMode: 'ITEMIZED',
    items: [
      { name: 'Lẩu bò', quantity: 2, unitPrice: 150_000 },
      { name: 'Bia Tiger', quantity: 1, unitPrice: 250_000 },
    ],
    discount: none,
    service: none,
    vat: none,
    ...overrides,
  }
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(PeopleError)
    expect((e as PeopleError).code).toBe(code)
    return
  }
  throw new Error(`expected ${code}`)
}

describe('computeInvoice — hoá đơn có món', () => {
  it('tính đúng giảm giá → phí phục vụ → VAT và phân bổ khớp tổng (AC-13)', () => {
    const result = computeInvoice(itemized({ discount: pct(10), service: pct(5), vat: pct(8) }))
    expect(result.subtotalAmount).toBe(550_000)
    expect(result.bill.discountAmount).toBe(55_000) // 10%
    expect(result.bill.serviceAmount).toBe(24_750) // 5% trên 495 000
    expect(result.bill.vatAmount).toBe(41_580) // 8% trên 519 750
    expect(result.bill.totalAmount).toBe(561_330)

    const sum = (key: 'finalAmount' | 'allocatedDiscountAmount' | 'allocatedServiceAmount' | 'allocatedVatAmount') =>
      result.items.reduce((s, it) => s + it[key], 0)
    expect(sum('finalAmount')).toBe(result.bill.totalAmount)
    expect(sum('allocatedDiscountAmount')).toBe(result.bill.discountAmount)
    expect(sum('allocatedServiceAmount')).toBe(result.bill.serviceAmount)
    expect(sum('allocatedVatAmount')).toBe(result.bill.vatAmount)
  })

  it('lấy thành tiền từ số lượng × đơn giá khi không nhập riêng', () => {
    const result = computeInvoice(itemized())
    expect(result.items.map((it) => it.rawAmount)).toEqual([300_000, 250_000])
  })

  it('dùng thành tiền nhập tay khi có (ví dụ bill đã giảm giá từng dòng)', () => {
    const result = computeInvoice(
      itemized({ items: [{ name: 'Bia', quantity: 10, unitPrice: 25_000, rawAmount: 200_000 }] }),
    )
    expect(result.subtotalAmount).toBe(200_000)
  })

  it('gọn khoảng trắng tên quán và bỏ quán trống', () => {
    expect(computeInvoice(itemized({ vendorName: '  Lẩu   Bò  ' })).vendorName).toBe('Lẩu Bò')
    expect(computeInvoice(itemized({ vendorName: '   ' })).vendorName).toBeUndefined()
  })
})

describe('computeInvoice — chỉ nhập tổng tiền (TOTAL_ONLY)', () => {
  it('không có món và tổng gồm VAT cố định', () => {
    const result = computeInvoice({
      inputMode: 'TOTAL_ONLY',
      items: [],
      subtotalAmount: 100_000,
      discount: none,
      service: none,
      vat: fixed(8_000),
    })
    expect(result.items).toEqual([])
    expect(result.bill.totalAmount).toBe(108_000)
  })

  it('bắt buộc có tiền hàng', () => {
    expectCode(
      () => computeInvoice({ inputMode: 'TOTAL_ONLY', items: [], discount: none, service: none, vat: none }),
      'INVALID_AMOUNT',
    )
  })
})

describe('computeInvoice — kiểm lỗi', () => {
  it('từ chối hoá đơn có món mà không có món nào', () => {
    expectCode(() => computeInvoice(itemized({ items: [] })), 'INVALID_ITEM')
  })

  it('từ chối số lượng không nguyên hoặc bằng 0', () => {
    expectCode(() => computeInvoice(itemized({ items: [{ name: 'A', quantity: 0, unitPrice: 1000 }] })), 'INVALID_ITEM')
    expectCode(() => computeInvoice(itemized({ items: [{ name: 'A', quantity: 1.5, unitPrice: 1000 }] })), 'INVALID_ITEM')
  })

  it('từ chối tên món trống hoặc đơn giá âm', () => {
    expectCode(() => computeInvoice(itemized({ items: [{ name: '  ', quantity: 1, unitPrice: 1000 }] })), 'INVALID_ITEM')
    expectCode(() => computeInvoice(itemized({ items: [{ name: 'A', quantity: 1, unitPrice: -1 }] })), 'INVALID_AMOUNT')
  })

  it('từ chối ngày không có thật', () => {
    expectCode(() => computeInvoice(itemized({ invoiceDate: '2026-02-30' })), 'INVALID_DATE')
  })

  it('từ chối giảm giá theo % ngoài 0–100 và giảm giá bằng hoặc hơn tiền hàng', () => {
    expectCode(() => computeInvoice(itemized({ discount: pct(150) })), 'INVALID_DISCOUNT')
    expectCode(() => computeInvoice(itemized({ discount: fixed(550_000) })), 'INVALID_DISCOUNT') // bằng tiền hàng
    expectCode(() => computeInvoice(itemized({ discount: fixed(600_000) })), 'INVALID_DISCOUNT') // lớn hơn tiền hàng
  })

  it('từ chối phí phục vụ và VAT không hợp lệ đúng mã', () => {
    expectCode(() => computeInvoice(itemized({ service: pct(-1) })), 'INVALID_SERVICE')
    expectCode(() => computeInvoice(itemized({ vat: fixed(-5) })), 'INVALID_VAT')
  })

  it('từ chối tên quán quá dài', () => {
    expectCode(() => computeInvoice(itemized({ vendorName: 'x'.repeat(101) })), 'INVALID_NAME')
  })
})

describe('quy tắc chia tiền Epic 5', () => {
  it('R-2: TOTAL_ONLY luôn khoá EQUAL_TOTAL và từ chối BY_ITEM', () => {
    expect(resolveSplitType('TOTAL_ONLY')).toBe('EQUAL_TOTAL')
    expect(resolveSplitType('TOTAL_ONLY', 'EQUAL_TOTAL')).toBe('EQUAL_TOTAL')
    expectCode(() => resolveSplitType('TOTAL_ONLY', 'BY_ITEM'), 'SPLIT_TYPE_LOCKED')
  })

  it('R-3: ITEMIZED giữ splitType yêu cầu, mặc định EQUAL_TOTAL', () => {
    expect(resolveSplitType('ITEMIZED')).toBe('EQUAL_TOTAL')
    expect(resolveSplitType('ITEMIZED', 'BY_ITEM')).toBe('BY_ITEM')
  })

  it('R-4: equalSplit khử trùng, không rỗng, không ra ngoài kèo', () => {
    expect(validateEqualSplit(['a', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b'])
    expectCode(() => validateEqualSplit([], ['a']), 'EQUAL_SPLIT_EMPTY')
    expectCode(() => validateEqualSplit(['x'], ['a']), 'SPLIT_MEMBER_NOT_IN_SESSION')
  })

  it('R-5: normalizeItemConsumers bỏ shares = 0 và kiểm tra phạm vi', () => {
    const kept = normalizeItemConsumers(
      [{ memberId: 'a', shares: 2 }, { memberId: 'b', shares: 0 }],
      ['a', 'b'],
    )
    expect(kept).toEqual([{ memberId: 'a', shares: 2 }])
    expectCode(() => normalizeItemConsumers([{ memberId: 'x', shares: 1 }], ['a']), 'CONSUMER_NOT_IN_SESSION')
    expectCode(() => normalizeItemConsumers([{ memberId: 'a', shares: -1 }], ['a']), 'INVALID_SHARES')
    expectCode(() => normalizeItemConsumers([{ memberId: 'a', shares: 1000 }], ['a']), 'INVALID_SHARES')
    expectCode(() => normalizeItemConsumers([{ memberId: 'a', shares: 1.5 }], ['a']), 'INVALID_SHARES')
    expectCode(
      () => normalizeItemConsumers([{ memberId: 'a', shares: 1 }, { memberId: 'a', shares: 1 }], ['a']),
      'INVALID_SHARES',
    )
  })

  it('R-11: tiền tạm tính tỷ lệ theo số phần', () => {
    const preview = previewItemConsumerShares(100_000, [
      { memberId: 'a', shares: 3 },
      { memberId: 'b', shares: 1 },
    ])
    expect(preview.map((p) => p.approxAmount)).toEqual([75_000, 25_000])
    expect(preview[0].totalShares).toBe(4)
  })

  it('R-6: đếm món chưa có người ăn chỉ khi BY_ITEM', () => {
    const items = [{ consumers: [] }, { consumers: [{ memberId: 'a', shares: 1 }] }]
    expect(countUnassignedItems('BY_ITEM', items)).toBe(1)
    expect(countUnassignedItems('EQUAL_TOTAL', items)).toBe(0)
  })
})
