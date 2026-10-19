import type { ItemDraft } from '../../domain/invoiceRules'
import type { Adjustment } from '../../domain/billMath'
import { parseMoney } from '../../lib/money'
import { PeopleError } from '../../services/peopleErrors'
import type { AdjustmentMode, InvoiceItem } from '../../types'

/*
 * Trạng thái ô nhập của form hoá đơn (dạng chuỗi như người dùng gõ) và cách đổi sang dữ liệu đã kiểm.
 * Lỗi nhập sai ném `PeopleError` để form hiện đúng thông báo.
 */

export interface ItemRow {
  key: string
  id?: string
  name: string
  quantity: string
  unitPrice: string
  /** Thành tiền; tự tính lại khi đổi số lượng hoặc đơn giá, nhưng người dùng sửa tay được. */
  amount: string
  /** Dòng OCR không chắc (SL × đơn giá không khớp thành tiền): cần xem lại (BR-4.8). */
  uncertain?: boolean
}

export interface AdjustmentState {
  mode: AdjustmentMode
  value: string
}

export const NO_ADJUSTMENT: AdjustmentState = { mode: 'NONE', value: '' }

let rowSeq = 0
export function newItemRow(init: Partial<Omit<ItemRow, 'key'>> = {}): ItemRow {
  rowSeq += 1
  return { key: `row-${rowSeq}`, name: '', quantity: '1', unitPrice: '', amount: '', ...init }
}

/** Thành tiền gợi ý = số lượng × đơn giá, nếu cả hai đọc được. */
export function suggestAmount(quantity: string, unitPrice: string): string {
  const q = Number(quantity.trim())
  const price = parseMoney(unitPrice)
  if (!Number.isInteger(q) || q < 1 || price === null) return ''
  return String(q * price)
}

export function rowFromItem(item: InvoiceItem): ItemRow {
  return {
    key: item.id,
    id: item.id,
    name: item.name,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    amount: String(item.rawAmount),
  }
}

export function adjustmentFrom(mode: AdjustmentMode, value: number): AdjustmentState {
  return mode === 'NONE' ? NO_ADJUSTMENT : { mode, value: String(value) }
}

/** Đổi ô tiền (chuỗi) sang số nguyên đồng. Trống hoặc sai đều báo lỗi có tên trường. */
export function parseMoneyField(value: string, label: string): number {
  const parsed = parseMoney(value)
  if (parsed === null) throw new PeopleError('INVALID_AMOUNT', `${label} không hợp lệ. Ví dụ: 45000, 45.000 hoặc 45k.`)
  return parsed
}

/** Đổi một khoản điều chỉnh: phần trăm là số nguyên 0–100, số tiền là tiền đồng. */
export function parseAdjustment(state: AdjustmentState, label: string): Adjustment {
  if (state.mode === 'NONE') return { mode: 'NONE', value: 0 }
  if (state.mode === 'PERCENTAGE') {
    const n = Number(state.value.trim())
    if (state.value.trim() === '' || !Number.isInteger(n)) {
      throw new PeopleError('INVALID_VAT', `${label}: nhập tỷ lệ phần trăm là số nguyên.`)
    }
    return { mode: 'PERCENTAGE', value: n }
  }
  return { mode: 'FIXED_AMOUNT', value: parseMoneyField(state.value, label) }
}

/**
 * Đổi các dòng món sang dữ liệu nhập. Dòng trống hoàn toàn (người dùng bấm "Thêm món" rồi bỏ đó) bị bỏ qua.
 * Thành tiền bỏ trống thì để hàm tính toán tự suy ra.
 */
export function parseItemRows(rows: ItemRow[]): ItemDraft[] {
  const filled = rows.filter((row) => row.name.trim() !== '' || row.unitPrice.trim() !== '' || row.amount.trim() !== '')
  return filled.map((row) => {
    const quantity = Number(row.quantity.trim())
    const unitPrice = parseMoneyField(row.unitPrice, `Đơn giá của "${row.name.trim() || 'món'}"`)
    const rawAmount = row.amount.trim() === '' ? undefined : parseMoneyField(row.amount, `Thành tiền của "${row.name.trim() || 'món'}"`)
    return { id: row.id, name: row.name, quantity, unitPrice, rawAmount }
  })
}
