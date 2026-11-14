// Ghép các giai đoạn thành parseReceipt.
import { DISCOUNT_RE, EXTRA_FEE_RE, REDUCTION_RE, SERVICE_RE, SUBTOTAL_RE, TAX_ID_RE, THANH_TIEN_RE, TOTAL_AMOUNT_RE, TOTAL_RE, VAT_RE, hit } from './patterns'
import { BARE_TONG_RE, PRETAX_RE, TAX_INCLUDED_TOTAL_RE, adjustmentOf, dropTotalRows, isAdjustmentLine, isTotalLine, majorityTotal, mergeRounding, roundingOf, totalValue, twoTotals, zeroBalanceTotal } from './adjustments'
import { detectNumbering, findItemsStart, readItems, tidyItemName } from './items'
import { findDate, findVendor } from './header'
import { findGroupRows, groupKind, reconcileGroups } from './groups'
import { isSeparatorLine, normalizeLine } from './normalize'
import { moneyValues } from './money'
import { parseVatTable } from './table'
import { t } from '../../i18n'
import type { ParsedItem, ParsedReceipt } from './types'

/*
 * Bộ phân tích văn bản OCR của hoá đơn (02 §3, BR-4.7, BR-4.14). Hàm thuần: văn bản vào, dữ liệu gợi ý ra.
 * Nguyên tắc: không đoán. Thứ không chắc thì bỏ trống hoặc đánh dấu `uncertain`, để người dùng sửa.
 */

/** Phân tích văn bản OCR của một hoá đơn. Không ném lỗi: thứ không đọc được thì bỏ trống. */
export function parseReceipt(rawText: string): ParsedReceipt {
  // Gạch phân cách được ghi lại trước khi normalizeLine xoá chúng: `boundaries` là chỉ số dòng mở đầu mỗi khối.
  const lines: string[] = []
  const boundaries = new Set<number>()
  for (const raw of rawText.split(/\r?\n/)) {
    if (isSeparatorLine(raw)) {
      if (lines.length > 0) boundaries.add(lines.length)
      continue
    }
    const line = normalizeLine(raw)
    if (line.length > 0) lines.push(line)
  }

  const vendorName = findVendor(lines)
  const table = parseVatTable(lines)
  const useTable = table !== null && (table.items.length > 0 || table.rows.unread.length > 0)
  const origins = new Map<ParsedItem, number>()
  const sttRead = new Set<number>()
  const result: ParsedReceipt = { items: useTable ? table.items : readItems(lines, vendorName, origins, boundaries, sttRead) }
  if (!useTable) {
    // Không có bảng STT chuẩn: dùng số thứ tự đầu dòng làm gợi ý số món (thiếu số nào thì báo thiếu món).
    const numbering = detectNumbering(lines, findItemsStart(lines))
    if (numbering) {
      const unread = Array.from({ length: numbering.count }, (_, k) => k + 1)
        .filter((n) => !sttRead.has(n))
        .map((n) => t('STT {n}: không đọc được dòng này', { n }))
      result.tableRows = { expected: numbering.count, read: numbering.count - unread.length, unread }
    }
  }
  if (useTable) {
    result.tableRows = table.rows
    if (table.discount > 0) result.discount = { mode: 'FIXED_AMOUNT', value: table.discount }
    if (table.vatIncluded) result.vatIncluded = true
  }

  const invoiceDate = findDate(lines)
  if (invoiceDate) result.invoiceDate = invoiceDate

  if (vendorName) result.vendorName = vendorName

  const groups = findGroupRows(lines)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (useTable && table.consumed.has(i)) continue
    if (groups.indexes.has(i)) continue
    if (i > 0 && hit(THANH_TIEN_RE, line) && moneyValues(line).length > 0) {
      // "Thành tiền" sau các dòng món: tiền hàng nếu phía dưới còn dòng tổng thanh toán, ngược lại là tổng bill.
      const value = moneyValues(line)[moneyValues(line).length - 1]
      const paymentBelow = lines.slice(i + 1).some((next) => isTotalLine(next) || hit(TOTAL_AMOUNT_RE, next))
      if (paymentBelow) {
        if (result.billSubtotal === undefined) result.billSubtotal = value
      } else result.billTotal = value
    } else if (hit(REDUCTION_RE, line)) {
      const values = moneyValues(line)
      if (values.length > 0) result.discount = { mode: 'FIXED_AMOUNT', value: values[0] }
    } else if (hit(TOTAL_AMOUNT_RE, line)) {
      const values = moneyValues(line)
      if (values.length > 0) result.billTotal = values[values.length - 1]
    } else if (hit(PRETAX_RE, line) && (hit(TOTAL_RE, line) || hit(VAT_RE, line) || hit(SUBTOTAL_RE, line))) {
      // "Tổng cộng tiền chưa thuế 55.555  Tiền thuế GTGT 4.445": tiền hàng trước thuế, không phải tổng thanh toán.
      const values = moneyValues(line)
      if (values.length > 0 && result.billSubtotal === undefined) result.billSubtotal = values[0]
      if (values.length > 1 && hit(VAT_RE, line)) result.vat = { mode: 'FIXED_AMOUNT', value: values[values.length - 1] }
    } else if (hit(TAX_INCLUDED_TOTAL_RE, line) && hit(/tong|total|thanh toan/, line)) {
      const value = totalValue(lines, i)
      if (value !== undefined) result.billTotal = value
    } else if (hit(VAT_RE, line)) {
      if (hit(TAX_ID_RE, line)) continue
      const adj = adjustmentOf(line)
      if (adj) result.vat = adj
    } else if (hit(EXTRA_FEE_RE, line)) {
      const values = moneyValues(line)
      if (values.length > 0) {
        const prev = result.service?.mode === 'FIXED_AMOUNT' ? result.service.value : 0
        result.service = { mode: 'FIXED_AMOUNT', value: prev + values[values.length - 1] }
      }
    } else if (hit(SERVICE_RE, line)) {
      const adj = adjustmentOf(line)
      if (adj) result.service = adj
    } else if (hit(DISCOUNT_RE, line)) {
      const adj = adjustmentOf(line)
      if (adj) result.discount = adj
    } else if (isTotalLine(line)) {
      const value = totalValue(lines, i)
      if (value !== undefined) result.billTotal = value
    } else if (hit(SUBTOTAL_RE, line)) {
      const values = moneyValues(line)
      if (values.length > 0) result.billSubtotal = values[values.length - 1]
    }
  }

  // Chỉ có một dòng nhãn "Tổng" đứng riêng ("Tổng 505,000") và không có dòng tổng nào khác: đó là tổng bill.
  // Nếu phía dưới còn giảm giá, phí hay VAT thì nó là tiền hàng.
  if (result.billTotal === undefined) {
    const at = lines.findIndex((line) => hit(BARE_TONG_RE, line) && moneyValues(line).length > 0)
    if (at >= 0) {
      const values = moneyValues(lines[at])
      const value = values[values.length - 1]
      const adjustedBelow = lines.slice(at + 1).some((line) => isAdjustmentLine(line) && adjustmentOf(line) !== undefined)
      if (!adjustedBelow) result.billTotal = value
      else if (result.billSubtotal === undefined) result.billSubtotal = value
    }
  }

  const majority = majorityTotal(lines)
  if (majority !== undefined) result.billTotal = majority

  // Hai dòng "Tổng" (tiền hàng, rồi tổng bill) và dòng "Làm tròn" gộp vào giảm giá (spec: Đọc bill có hai dòng Tổng và làm tròn).
  const pair = twoTotals(lines)
  if (pair) {
    result.billSubtotal = pair.subtotal
    result.billTotal = pair.total
  }
  // Dòng cuối là số dư 0 sau thanh toán: tổng bill là dòng tổng ngay phía trên (spec receipt-ocr).
  const zeroTotal = zeroBalanceTotal(lines)
  if (zeroTotal !== undefined) result.billTotal = zeroTotal
  const merged = mergeRounding(result.discount, result.billSubtotal, result.billTotal, roundingOf(lines))
  if (merged !== undefined) result.discount = merged

  // Giá từng dòng đã gồm thuế: VAT ghi ở chân bill là phần nằm sẵn trong giá, không cộng thêm; tiền hàng trước thuế cũng không dùng để so.
  if (result.vatIncluded) {
    delete result.vat
    delete result.billSubtotal
  }

  result.items = dropTotalRows(result.items, result.billTotal, result.billSubtotal)

  if (groups.rows.length > 0) {
    // Các dòng đọc được từ chính dòng nhóm ("Đồ uống 120.000") đã được thay bằng dòng nhóm chuẩn hoá.
    const others = result.items.filter((item) => groupKind(item.name) === null && !groups.indexes.has(origins.get(item) ?? -1))
    if (others.length === 0) {
      // Không đọc được món nào: hai dòng nhóm là số liệu duy nhất để chia tiền.
      result.items = groups.rows
    } else {
      const reconciled = reconcileGroups(others, useTable ? undefined : origins, groups.lines)
      result.items = reconciled.items
      if (reconciled.checks.length > 0) result.groupChecks = reconciled.checks
    }
  }

  result.items = result.items.map(tidyItemName)

  return result
}
