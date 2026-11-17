import type { ParsedReceipt } from '../../domain/receiptParser'
import type { ReceiptCheck } from '../../domain/receiptValidation'
import type { InvoiceRulesDraft } from '../../domain/invoiceRules'
import { NO_ADJUSTMENT, newItemRow, parseAdjustment, parseItemRows, type AdjustmentState, type ItemRow } from './formState'
import { t } from '../../i18n'

/** Những gì kết quả OCR có thể điền vào form. Trường nào không đọc được thì là `undefined`. */
export interface ReceiptFill {
  vendorName?: string
  invoiceDate?: string
  rows?: ItemRow[]
  discount?: AdjustmentState
  service?: AdjustmentState
  vat?: AdjustmentState
  billTotal?: number
  /** Kết quả đối chiếu OCR (SL × đơn giá, tổng bill) để báo người dùng. */
  check?: Pick<ReceiptCheck, 'status' | 'notes'>
}

/** Đổi kết quả phân tích sang trạng thái ô nhập của form (chưa lưu, BR-4.7). */
export function fillFromReceipt(parsed: ParsedReceipt): ReceiptFill {
  const fill: ReceiptFill = {}
  if (parsed.vendorName) fill.vendorName = parsed.vendorName
  if (parsed.invoiceDate) fill.invoiceDate = parsed.invoiceDate
  if (parsed.items.length > 0) {
    fill.rows = parsed.items.map((item) =>
      newItemRow({
        name: item.name,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        amount: String(item.rawAmount),
        uncertain: item.uncertain,
      }),
    )
  }
  const toState = (adj: { mode: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number }): AdjustmentState => ({
    mode: adj.mode,
    value: String(adj.value),
  })
  if (parsed.discount) fill.discount = toState(parsed.discount)
  if (parsed.service) fill.service = toState(parsed.service)
  if (parsed.vat) fill.vat = toState(parsed.vat)
  if (parsed.billTotal !== undefined) fill.billTotal = parsed.billTotal
  return fill
}

/** Form đã có dữ liệu do người dùng nhập: quét lại phải hỏi trước khi ghi đè (R-13). */
export function hasUserEntries(input: {
  vendorName: string
  invoiceDate: string
  rows: ItemRow[]
  subtotal: string
  discount: AdjustmentState
  service: AdjustmentState
  vat: AdjustmentState
}): boolean {
  const filledRow = input.rows.some((r) => r.name.trim() !== '' || r.unitPrice.trim() !== '')
  const filledAdj = [input.discount, input.service, input.vat].some((a) => a.mode !== 'NONE' && a.value.trim() !== '')
  return input.vendorName.trim() !== '' || input.invoiceDate !== '' || filledRow || input.subtotal.trim() !== '' || filledAdj
}

/**
 * Dựng dữ liệu hoá đơn từ kết quả quét, theo đúng đường của form khi bấm Lưu mà không sửa gì (luồng tạo nhanh từ bill).
 * Ném `PeopleError` nếu có số không hợp lệ.
 */
export function draftFromFill(fill: ReceiptFill): InvoiceRulesDraft {
  return {
    inputMode: 'ITEMIZED',
    vendorName: fill.vendorName ?? '',
    invoiceDate: fill.invoiceDate,
    items: parseItemRows(fill.rows ?? []),
    discount: parseAdjustment(fill.discount ?? NO_ADJUSTMENT, t('Giảm giá')),
    service: parseAdjustment(fill.service ?? NO_ADJUSTMENT, t('Phí phục vụ')),
    vat: parseAdjustment(fill.vat ?? NO_ADJUSTMENT, 'VAT'),
  }
}
