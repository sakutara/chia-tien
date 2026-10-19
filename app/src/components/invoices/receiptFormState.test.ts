import { describe, expect, it } from 'vitest'
import { RECEIPT_FIXTURES } from '../../domain/__fixtures__/receipts'
import { parseReceipt } from '../../domain/receiptParser'
import { NO_ADJUSTMENT, newItemRow } from './formState'
import { fillFromReceipt, hasUserEntries } from './receiptFormState'

describe('fillFromReceipt', () => {
  it('điền món, ngày, quán, VAT và tổng bill từ bill mẫu (bố cục 2 dòng)', () => {
    const fill = fillFromReceipt(parseReceipt(RECEIPT_FIXTURES[0].text))
    expect(fill.vendorName).toBe('LẨU BÒ GỖ NGỌC')
    expect(fill.invoiceDate).toBe('2026-10-19')
    expect(fill.rows?.map((r) => [r.name, r.quantity, r.unitPrice, r.amount])).toEqual([
      ['Lẩu bò mỹ', '2', '150000', '300000'],
      ['Bia Tiger 330ml', '10', '25000', '250000'],
    ])
    expect(fill.vat).toEqual({ mode: 'FIXED_AMOUNT', value: '44000' })
    expect(fill.billTotal).toBe(594_000)
    expect(fill.discount).toBeUndefined()
  })

  it('đánh dấu dòng không chắc để người dùng xem lại (BR-4.8)', () => {
    const fill = fillFromReceipt(parseReceipt(RECEIPT_FIXTURES[3].text))
    expect(fill.rows?.map((r) => r.uncertain)).toEqual([true, false])
  })

  it('không có món thì không đụng tới danh sách món', () => {
    const fill = fillFromReceipt(parseReceipt('Quán A\nTổng cộng 50.000'))
    expect(fill.rows).toBeUndefined()
    expect(fill.billTotal).toBe(50_000)
  })
})

describe('hasUserEntries', () => {
  const empty = {
    vendorName: '',
    invoiceDate: '',
    rows: [newItemRow()],
    subtotal: '',
    discount: NO_ADJUSTMENT,
    service: NO_ADJUSTMENT,
    vat: NO_ADJUSTMENT,
  }

  it('form trống thì quét không cần hỏi', () => {
    expect(hasUserEntries(empty)).toBe(false)
  })

  it('có món hoặc có ô đã nhập thì phải hỏi trước khi ghi đè', () => {
    expect(hasUserEntries({ ...empty, rows: [newItemRow({ name: 'Bia', unitPrice: '25000' })] })).toBe(true)
    expect(hasUserEntries({ ...empty, vendorName: 'Quán' })).toBe(true)
    expect(hasUserEntries({ ...empty, vat: { mode: 'PERCENTAGE', value: '8' } })).toBe(true)
  })
})
