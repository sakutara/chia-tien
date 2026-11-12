// Giảm giá, phí, VAT và dòng tổng của bill.
import { ADDRESS_RE, DISCOUNT_RE, EXTRA_FEE_RE, PERCENT_RE, SERVICE_RE, TAX_ID_RE, TOTAL_AMOUNT_RE, TOTAL_EXCLUDE_RE, TOTAL_RE, VAT_RE, hit } from './patterns'
import { isDateLine } from './header'
import { moneyValues } from './money'
import { normalizeLine } from './normalize'
import type { ParsedAdjustment, ParsedItem } from './types'

export function percentOf(line: string): number | undefined {
  const match = new RegExp(PERCENT_RE.source).exec(line)
  if (!match) return undefined
  const value = Math.round(Number(match[1].replace(',', '.')))
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : undefined
}

/** Khoản điều chỉnh trên một dòng: ưu tiên số tiền ghi trên bill (khớp đúng), không có thì lấy %. */
export function adjustmentOf(line: string): ParsedAdjustment | undefined {
  const values = moneyValues(line)
  if (values.length > 0) return { mode: 'FIXED_AMOUNT', value: values[values.length - 1] }
  const pct = percentOf(line)
  if (pct !== undefined) return { mode: 'PERCENTAGE', value: pct }
  return undefined
}

export function isAdjustmentLine(line: string): boolean {
  return (hit(VAT_RE, line) && !hit(TAX_ID_RE, line)) || hit(SERVICE_RE, line) || hit(DISCOUNT_RE, line) || hit(EXTRA_FEE_RE, line)
}

export function isTotalLine(line: string): boolean {
  return hit(TOTAL_RE, line) && !hit(TOTAL_EXCLUDE_RE, line)
}

/**
 * Bỏ "món" thực ra là dòng tổng bị đọc lệch chữ ("Tông Cộng", "Téng tiền"): số tiền bằng đúng tổng hoặc tiền hàng ghi
 * trên bill trong khi còn món khác. Một món duy nhất bằng tổng bill thì giữ (bill chỉ có một món).
 */
export function dropTotalRows(items: ParsedItem[], billTotal?: number, billSubtotal?: number): ParsedItem[] {
  if (items.length < 2) return items
  const refs = [billTotal, billSubtotal].filter((v): v is number => v !== undefined)
  return items.filter((item) => !refs.includes(item.rawAmount))
}

/**
 * Số tiền ở các dòng có tiền cuối bill (mới nhất trước), tối đa `count` giá trị khác nhau. Dòng cuối thường là tổng bill
 * kể cả khi chữ "Tổng cộng" không đọc được; bỏ qua dòng ngày, địa chỉ/điện thoại và dòng phần trăm.
 */
export function trailingAmounts(rawText: string, count: number): number[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line.length > 0)
  const out: number[] = []
  for (let i = lines.length - 1; i >= 0 && out.length < count; i--) {
    const line = lines[i]
    if (isDateLine(line) || hit(ADDRESS_RE, line)) continue
    const values = moneyValues(line)
    if (values.length === 0) continue
    const value = values[values.length - 1]
    if (!out.includes(value)) out.push(value)
  }
  return out
}

export const PRETAX_RE = /truoc thue|chua thue|chua co thue|chua gom thue|exc\.? ?vat|excl|before tax/
/** Dòng tổng đã gồm thuế: "Tổng cộng số tiền đã có thuế GTGT", "Tổng thanh toán (đã gồm VAT)". */
export const TAX_INCLUDED_TOTAL_RE = /(?:da|gom|bao gom|co) (?:co |gom )?(?:thue|vat|gtgt)|vat included|tax included|incl\.? ?vat/
/** Dòng chỉ có số tiền (nhãn song ngữ xuống dòng: "Tổng cộng ...:" rồi "60.000" ở dòng sau). */
export const MONEY_ONLY_RE = /^\d[\d.,]*\s*(?:[₫đ]|vnd)?$/i

/** Số tiền của dòng; nhãn không có số thì lấy dòng ngay sau nếu dòng đó chỉ có số tiền. */
export function totalValue(lines: string[], index: number): number | undefined {
  const values = moneyValues(lines[index])
  if (values.length > 0) return values[values.length - 1]
  const next = lines[index + 1]
  if (next !== undefined && MONEY_ONLY_RE.test(next)) return moneyValues(next)[0]
  return undefined
}

/**
 * Tổng bill khi các dòng tổng đọc lệch nhau (02 §3 bước 10): lấy số xuất hiện nhiều nhất trong các dòng tổng và tiền hàng,
 * nếu có số lặp lại ít nhất hai lần. Không có số nào lặp lại thì trả `undefined` (validation thử biến thể 1 ↔ 4).
 */
export function majorityTotal(lines: string[]): number | undefined {
  const values: number[] = []
  lines.forEach((line, i) => {
    // Chỉ dòng "tiền hàng" (không ghi trước thuế) và các dòng tổng; dòng "tiền thuế" không tính.
    const isGross = hit(/tien hang/, line) && !hit(PRETAX_RE, line)
    if (hit(PRETAX_RE, line) || hit(VAT_RE, line)) return
    if (!isTotalLine(line) && !hit(TOTAL_AMOUNT_RE, line) && !hit(/con phai thu/, line) && !isGross) return
    const value = totalValue(lines, i)
    if (value !== undefined) values.push(value)
  })
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: { value: number; count: number } | undefined
  for (const [value, count] of counts) if (!best || count > best.count) best = { value, count }
  return best && best.count >= 2 ? best.value : undefined
}
