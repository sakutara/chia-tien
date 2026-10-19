import { isValidYmd } from '../lib/dates'
import { PeopleError } from '../services/peopleErrors'
import type { InvoiceInputMode, InvoiceItem, InvoiceSplitType, ItemShare } from '../types'
import { allocateInvoiceItems, computeBill, type Adjustment, type BillTotals } from './billMath'

/*
 * Kiểm tra và tính toán một hoá đơn trước khi lưu (BR-4.4, BR-4.5, BR-4.9, BR-4.15, R-8…R-10).
 * Toàn hàm thuần: không đọc DB, không chạm DOM.
 */

export const ITEM_NAME_MAX = 100
export const VENDOR_NAME_MAX = 100

export interface ItemDraft {
  /** Có khi sửa món đã tồn tại, để giữ nguyên `id` (và sau này là `consumers`). */
  id?: string
  name: string
  quantity: number
  unitPrice: number
  /** Thành tiền; nếu bỏ trống thì tính `quantity × unitPrice`. */
  rawAmount?: number
}

export interface InvoiceRulesDraft {
  inputMode: InvoiceInputMode
  vendorName?: string
  invoiceDate?: string
  items: ItemDraft[]
  /** Tiền hàng khi nhập chỉ tổng tiền (`TOTAL_ONLY`). */
  subtotalAmount?: number
  discount: Adjustment
  service: Adjustment
  vat: Adjustment
}

export interface ComputedItem {
  id?: string
  name: string
  quantity: number
  unitPrice: number
  rawAmount: number
  allocatedDiscountAmount: number
  allocatedServiceAmount: number
  allocatedVatAmount: number
  finalAmount: number
}

export interface ComputedInvoice {
  inputMode: InvoiceInputMode
  vendorName?: string
  invoiceDate?: string
  subtotalAmount: number
  bill: BillTotals
  items: ComputedItem[]
}

const isNonNegativeInteger = (n: number) => Number.isSafeInteger(n) && n >= 0

function cleanText(raw: string | undefined): string | undefined {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim()
  return cleaned === '' ? undefined : cleaned
}

/** Kiểm từng khoản điều chỉnh; lỗi gắn đúng mã của khoản đó để UI hiện đúng ô. */
function checkAdjustment(adj: Adjustment, code: 'INVALID_DISCOUNT' | 'INVALID_SERVICE' | 'INVALID_VAT', label: string) {
  if (adj.mode === 'NONE') return
  if (adj.mode === 'PERCENTAGE') {
    if (!Number.isInteger(adj.value) || adj.value < 0 || adj.value > 100) {
      throw new PeopleError(code, `${label} theo phần trăm phải từ 0 đến 100.`, { value: adj.value })
    }
    return
  }
  if (!isNonNegativeInteger(adj.value)) {
    throw new PeopleError(code, `${label} phải là số tiền không âm.`, { value: adj.value })
  }
}

/** Kiểm tra và tính toàn bộ hoá đơn. Ném `PeopleError` khi dữ liệu không hợp lệ. */
export function computeInvoice(draft: InvoiceRulesDraft): ComputedInvoice {
  const vendorName = cleanText(draft.vendorName)
  if (vendorName && vendorName.length > VENDOR_NAME_MAX) {
    throw new PeopleError('INVALID_NAME', `Tên quán tối đa ${VENDOR_NAME_MAX} ký tự.`)
  }
  const invoiceDate = draft.invoiceDate ? draft.invoiceDate.trim() : undefined
  if (invoiceDate && !isValidYmd(invoiceDate)) {
    throw new PeopleError('INVALID_DATE', 'Ngày trên hoá đơn không hợp lệ.')
  }

  checkAdjustment(draft.discount, 'INVALID_DISCOUNT', 'Giảm giá')
  checkAdjustment(draft.service, 'INVALID_SERVICE', 'Phí phục vụ')
  checkAdjustment(draft.vat, 'INVALID_VAT', 'VAT')

  let subtotal: number
  let items: ComputedItem[] = []

  if (draft.inputMode === 'TOTAL_ONLY') {
    if (draft.subtotalAmount === undefined || !isNonNegativeInteger(draft.subtotalAmount)) {
      throw new PeopleError('INVALID_AMOUNT', 'Tiền hàng phải là số tiền hợp lệ.')
    }
    subtotal = draft.subtotalAmount
  } else {
    if (draft.items.length === 0) {
      throw new PeopleError('INVALID_ITEM', 'Hoá đơn có chi tiết món phải có ít nhất một món.')
    }
    items = draft.items.map((it) => {
      const name = cleanText(it.name)
      if (!name || name.length > ITEM_NAME_MAX) {
        throw new PeopleError('INVALID_ITEM', `Tên món là bắt buộc và tối đa ${ITEM_NAME_MAX} ký tự.`)
      }
      if (!Number.isInteger(it.quantity) || it.quantity < 1) {
        throw new PeopleError('INVALID_ITEM', `Số lượng của "${name}" phải là số nguyên từ 1.`)
      }
      if (!isNonNegativeInteger(it.unitPrice)) {
        throw new PeopleError('INVALID_AMOUNT', `Đơn giá của "${name}" phải là số tiền không âm.`)
      }
      const rawAmount = it.rawAmount ?? it.quantity * it.unitPrice
      if (!isNonNegativeInteger(rawAmount)) {
        throw new PeopleError('INVALID_AMOUNT', `Thành tiền của "${name}" phải là số tiền không âm.`)
      }
      return {
        id: it.id,
        name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        rawAmount,
        allocatedDiscountAmount: 0,
        allocatedServiceAmount: 0,
        allocatedVatAmount: 0,
        finalAmount: 0,
      }
    })
    subtotal = items.reduce((sum, it) => sum + it.rawAmount, 0)
  }

  if (subtotal <= 0) {
    throw new PeopleError('INVALID_AMOUNT', 'Tiền hàng phải lớn hơn 0.')
  }

  const bill = computeBill({ subtotal, discount: draft.discount, service: draft.service, vat: draft.vat })
  if (bill.discountAmount >= subtotal) {
    throw new PeopleError('INVALID_DISCOUNT', 'Giảm giá phải nhỏ hơn tiền hàng.')
  }
  if (bill.totalAmount <= 0) {
    throw new PeopleError('INVALID_AMOUNT', 'Tổng thanh toán phải lớn hơn 0.')
  }

  if (items.length > 0) {
    const alloc = allocateInvoiceItems(
      items.map((it) => it.rawAmount),
      bill,
    )
    items = items.map((it, i) => ({
      ...it,
      allocatedDiscountAmount: alloc.discount[i],
      allocatedServiceAmount: alloc.service[i],
      allocatedVatAmount: alloc.vat[i],
      finalAmount: alloc.final[i],
    }))
  }

  return {
    inputMode: draft.inputMode,
    vendorName,
    invoiceDate,
    subtotalAmount: subtotal,
    bill,
    items,
  }
}

/*
 * Quy tắc chia tiền của hoá đơn (Epic 5: BR-5.2…BR-5.8, R-1…R-6, R-11).
 * Các hàm dưới đây cũng là toàn hàm thuần, không đọc DB.
 */

export const MAX_ITEM_SHARES = 999

/** R-2, R-3: hoá đơn TOTAL_ONLY luôn là EQUAL_TOTAL; ITEMIZED mặc định EQUAL_TOTAL nếu không yêu cầu. */
export function resolveSplitType(inputMode: InvoiceInputMode, requested?: InvoiceSplitType): InvoiceSplitType {
  if (inputMode === 'TOTAL_ONLY') {
    if (requested === 'BY_ITEM') {
      throw new PeopleError('SPLIT_TYPE_LOCKED', 'Hoá đơn chỉ nhập tổng tiền chỉ được chia đều theo tổng.', { inputMode })
    }
    return 'EQUAL_TOTAL'
  }
  return requested ?? 'EQUAL_TOTAL'
}

/** R-4: danh sách chia đều khác rỗng, không trùng, là tập con của người tham gia kèo. */
export function validateEqualSplit(equalSplitIds: string[], sessionParticipantIds: string[]): string[] {
  const unique = [...new Set(equalSplitIds)]
  const outsider = unique.find((id) => !sessionParticipantIds.includes(id))
  if (outsider) {
    throw new PeopleError('SPLIT_MEMBER_NOT_IN_SESSION', 'Chỉ chia được cho người tham gia kèo.', { memberId: outsider })
  }
  if (unique.length === 0) {
    throw new PeopleError('EQUAL_SPLIT_EMPTY', 'Phải chọn ít nhất một người cùng chia hoá đơn.')
  }
  return unique
}

/**
 * R-5: chuẩn hoá người ăn của một món. Bỏ `shares === 0` (gỡ người khỏi món), không cho trùng,
 * mọi người phải thuộc kèo và `shares` là số nguyên trong [1, 999].
 */
export function normalizeItemConsumers(consumers: ItemShare[], sessionParticipantIds: string[]): ItemShare[] {
  const seen = new Set<string>()
  const result: ItemShare[] = []
  for (const c of consumers) {
    if (!sessionParticipantIds.includes(c.memberId)) {
      throw new PeopleError('CONSUMER_NOT_IN_SESSION', 'Chỉ chọn được người tham gia kèo làm người ăn.', { memberId: c.memberId })
    }
    if (c.shares === 0) continue
    if (!Number.isInteger(c.shares) || c.shares < 1 || c.shares > MAX_ITEM_SHARES) {
      throw new PeopleError('INVALID_SHARES', `Số phần phải là số nguyên từ 1 đến ${MAX_ITEM_SHARES}.`, { shares: c.shares })
    }
    if (seen.has(c.memberId)) {
      throw new PeopleError('INVALID_SHARES', 'Một người không thể xuất hiện hai lần trong cùng một món.', { memberId: c.memberId })
    }
    seen.add(c.memberId)
    result.push({ memberId: c.memberId, shares: c.shares })
  }
  return result
}

/** R-11: tiền tạm tính của từng người trên món = round(F × s / S), chỉ để hiển thị. */
export function previewItemConsumerShares(
  finalAmount: number,
  consumers: ItemShare[],
): Array<{ memberId: string; shares: number; totalShares: number; approxAmount: number }> {
  const totalShares = consumers.reduce((sum, c) => sum + c.shares, 0)
  return consumers.map((c) => ({
    memberId: c.memberId,
    shares: c.shares,
    totalShares,
    approxAmount: totalShares > 0 ? Math.round((finalAmount * c.shares) / totalShares) : 0,
  }))
}

/** R-6, BR-5.8: số món chưa có người ăn khi hoá đơn ở chế độ BY_ITEM. */
export function countUnassignedItems(
  splitType: InvoiceSplitType,
  items: ReadonlyArray<Pick<InvoiceItem, 'consumers'>>,
): number {
  if (splitType !== 'BY_ITEM') return 0
  return items.filter((it) => it.consumers.length === 0).length
}
