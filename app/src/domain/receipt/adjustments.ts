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
 * Từ khoá nhãn tổng trong tên món (đã bỏ dấu qua `hit`), chịu được OCR lệch chữ: "Tông Cộng", "Téng tiền",
 * "Thành tiên", "mones Thanh ( án" đều có từ khoá. Chỉ có nghĩa khi số tiền của món bằng tổng/tiền hàng.
 */
export const ITEM_TOTAL_LABEL_RE = /\b(?:thanh|tien|tong|teng|toan|total|amount|khach|thua|thoi|cong|con lai|dat hang|dat coc|da tra)\b/

/**
 * Bỏ "món" thực ra là dòng tổng bị đọc lệch chữ ("Tông Cộng", "Téng tiền", "Thành tiên"): số tiền bằng đúng tổng hoặc tiền
 * hàng ghi trên bill trong khi còn món khác. Nếu có món trùng số mà tên mang nhãn tổng thì chỉ bỏ những món đó, giữ món có
 * tên thật (ví dụ "Oolong ... (Vừa)" 52.000 khi tổng 52.000). Không có món nào mang nhãn thì giữ hành vi cũ: bỏ mọi món
 * trùng số. Một món duy nhất thì giữ (bill chỉ có một món).
 */
export function dropTotalRows(items: ParsedItem[], billTotal?: number, billSubtotal?: number): ParsedItem[] {
  if (items.length < 2) return items
  const refs = [billTotal, billSubtotal].filter((v): v is number => v !== undefined)
  const matchesRef = (item: ParsedItem) => refs.includes(item.rawAmount)
  const labelled = (item: ParsedItem) => matchesRef(item) && hit(ITEM_TOTAL_LABEL_RE, item.name)
  if (items.some(labelled)) return items.filter((item) => !labelled(item))
  return items.filter((item) => !matchesRef(item))
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

/** Nhãn "Tổng" đứng riêng, không phải "Tổng cộng": "Tổng 495,000". Bill có hai dòng như vậy thì dòng đầu là tiền hàng. */
export const BARE_TONG_RE = /^tong\s*:?\s*\d/
/** Dòng làm tròn của bill: "Làm tròn 250", "Làm tròn -300". */
export const ROUNDING_RE = /^lam tron\b/

/** Hai dòng nhãn "Tổng" với số khác nhau: dòng đầu là tiền hàng, dòng sau là tổng bill. */
export function twoTotals(lines: string[]): { subtotal: number; total: number } | undefined {
  const values: number[] = []
  for (const line of lines) {
    if (!hit(BARE_TONG_RE, line)) continue
    const found = moneyValues(line)
    if (found.length > 0) values.push(found[found.length - 1])
  }
  if (values.length < 2) return undefined
  const first = values[0]
  const last = values[values.length - 1]
  return first === last ? undefined : { subtotal: first, total: last }
}

/** Số làm tròn có dấu: dương là bill làm tròn lên, âm là làm tròn xuống. */
export function roundingOf(lines: string[]): number | undefined {
  for (const line of lines) {
    if (!hit(ROUNDING_RE, line)) continue
    const found = moneyValues(line)
    if (found.length === 0) continue
    const value = found[found.length - 1]
    return /-\s*\d/.test(line) ? -value : value
  }
  return undefined
}

/**
 * Gộp làm tròn vào giảm giá (số nguyên đồng): làm tròn xuống cộng vào giảm giá, làm tròn lên trừ khỏi giảm giá.
 * Chỉ gộp khi tiền hàng - giảm giá mới + làm tròn đúng bằng tổng bill. Bill không có giảm giá mà làm tròn lên thì không gộp.
 */
export function mergeRounding(
  discount: ParsedAdjustment | undefined,
  billSubtotal: number | undefined,
  billTotal: number | undefined,
  rounding: number | undefined,
): ParsedAdjustment | undefined {
  if (rounding === undefined || rounding === 0 || billSubtotal === undefined || billTotal === undefined) return discount
  if (discount !== undefined && discount.mode !== 'FIXED_AMOUNT') return discount
  const current = discount?.value ?? 0
  if (rounding > 0 && current === 0) return discount
  const merged = current - rounding
  if (merged <= 0 || billSubtotal - merged !== billTotal) return discount
  return { mode: 'FIXED_AMOUNT', value: merged }
}
