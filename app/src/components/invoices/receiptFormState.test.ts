import { describe, expect, it } from 'vitest'
import { RECEIPT_FIXTURES } from '../../domain/__fixtures__/receipts'
import { parseReceipt } from '../../domain/receiptParser'
import { NO_ADJUSTMENT, newItemRow } from './formState'
import { draftFromFill, fillFromReceipt, hasUserEntries, vatRatesNotes } from './receiptFormState'
import { computeInvoice } from '../../domain/invoiceRules'

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

describe('draftFromFill', () => {
  it('dựng hoá đơn chi tiết món giống form khi lưu không sửa gì', () => {
    const draft = draftFromFill({
      vendorName: 'Phở Thìn',
      invoiceDate: '2026-03-05',
      rows: [newItemRow({ name: 'Phở', quantity: '2', unitPrice: '50000', amount: '100000' })],
      vat: { mode: 'PERCENTAGE', value: '8' },
    })
    expect(draft).toMatchObject({ inputMode: 'ITEMIZED', vendorName: 'Phở Thìn', invoiceDate: '2026-03-05' })
    expect(draft.items).toEqual([{ id: undefined, name: 'Phở', quantity: 2, unitPrice: 50000, rawAmount: 100000 }])
    expect(draft.discount).toEqual({ mode: 'NONE', value: 0 })
    expect(computeInvoice(draft).bill.totalAmount).toBe(108000)
  })
})

describe('vatRates và ghi chú VAT', () => {
  const TWO_RATES = `QUÁN NHẬU BIA HƠI
Ngày 19/10/2026
Phở bò 2 x 100.000 200.000
Bia Tiger 330ml 4 x 30.000 120.000
VAT 8% 40.000
VAT 10% 20.000
Tổng cộng 380.000`

  it('truyền vatRates từ kết quả phân tích sang form và ghi chú đã gộp', () => {
    const fill = fillFromReceipt(parseReceipt(TWO_RATES))
    expect(fill.vat).toEqual({ mode: 'FIXED_AMOUNT', value: '60000' })
    expect(fill.vatRates).toEqual([8, 10])
    expect(vatRatesNotes(fill)).toEqual(['Đã gộp VAT 8% + 10% thành một số tiền.'])
  })

  it('nhiều mức % không có số tiền: không điền VAT và nhắc nhập tay', () => {
    const fill = fillFromReceipt(parseReceipt('QUÁN A\nPhở bò 2 x 100.000 200.000\nVAT 8%\nVAT 10%\nTổng cộng 380.000'))
    expect(fill.vat).toBeUndefined()
    expect(vatRatesNotes(fill)).toEqual([expect.stringContaining('(8% + 10%)')])
  })

  it('bill một mức VAT không có ghi chú', () => {
    const fill = fillFromReceipt(parseReceipt('QUÁN A\nPhở bò 2 x 100.000 200.000\nVAT 8% 16.000\nTổng cộng 216.000'))
    expect(fill.vatRates).toBeUndefined()
    expect(vatRatesNotes(fill)).toEqual([])
  })
})
