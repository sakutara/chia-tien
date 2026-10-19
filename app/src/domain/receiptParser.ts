import { isValidYmd, isYmdInRange } from '../lib/dates'
import { parseMoney } from '../lib/money'
import { fold } from '../lib/textFold'

/*
 * Bộ phân tích văn bản OCR của hoá đơn (02 §3, BR-4.7, BR-4.14). Hàm thuần: văn bản vào, dữ liệu gợi ý ra.
 * Nguyên tắc: không đoán. Thứ không chắc thì bỏ trống hoặc đánh dấu `uncertain`, để người dùng sửa.
 */

export interface ParsedItem {
  name: string
  quantity: number
  unitPrice: number
  rawAmount: number
  /** Số lượng × đơn giá không khớp thành tiền trên bill: cần người dùng xem lại. */
  uncertain: boolean
}

export interface ParsedAdjustment {
  mode: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
}

export interface ParsedReceipt {
  invoiceDate?: string
  vendorName?: string
  items: ParsedItem[]
  discount?: ParsedAdjustment
  service?: ParsedAdjustment
  vat?: ParsedAdjustment
  /** Tổng thanh toán ghi trên bill, để đối chiếu với tổng các món (R-11). */
  billTotal?: number
  /** Dòng "Tổng tiền hàng" / "Tạm tính" ghi trên bill (trước giảm giá, phí, VAT), để đối chiếu tổng các món. */
  billSubtotal?: number
}

const PERCENT_RE = /(\d{1,2}(?:[.,]\d)?)\s*%/g
const MONEY_TOKEN_RE = /\d[\d.,]*k?/gi

const VAT_RE = /\b(vat|gtgt|thue)\b/
const SERVICE_RE = /phi phuc vu|phuc vu|phi dv|service/
const DISCOUNT_RE = /giam gia|chiet khau|khuyen mai|discount|\bck\b/
const TOTAL_RE = /tong cong|tong thanh toan|tong tien|can thanh toan|thanh toan|total/
/** Dòng tiền hàng / tạm tính: tổng các món, chưa gồm giảm giá, phí phục vụ, VAT. */
const SUBTOTAL_RE = /tien hang|tong tam tinh|tam tinh|sub ?total|cong tien/
const TOTAL_EXCLUDE_RE = /tien hang|tam tinh|tien mat|tien thua|tien thoi|\bthe\b|card|cash/

/** Dòng địa chỉ, điện thoại, mã số thuế: không phải tên quán cũng không phải món. */
const ADDRESS_RE = /d\/c|dia chi|sdt|\btel\b|hotline|phone|\bmst\b|ma so|website|www\./
/** Tiêu đề và chân trang của bill. */
const HEADER_RE = /hoa don|phieu|receipt|ten mon|ten hang|don gia|thanh tien|^sl\b|\bban\b|table|cam on|hen gap|thank|nhan vien|thu ngan|gio vao|gio ra|gio in|\bin:/
const FOOTER_RE = /^\W*t[oe0]ng\b|\bsub ?total\b|\bgrand\b|tong|tam tinh|tien mat|tien thua|tien thoi|thanh toan|tien hang|\bthe\b|card|cash|change/

const VENDOR_KEYWORD_RE = /nha hang|quan\b|cafe|coffee|\blau\b|bbq|\bbill\b|restaurant|karaoke|\btra\b|\bbar\b|buffet|\bcom\b|\bpho\b|\bbun\b|bistro|kitchen/

const QTY_PAIR_RE = /^(\d{1,3})\s*[xX×*]\s*(\d[\d.,]*k?)\s*=\s*(\d[\d.,]*k?)$/i
/** Tên, số lượng, đơn giá và thành tiền trên cùng một dòng: "Lẩu bò 2 x 150.000 = 300.000". */
const ONE_LINE_EQ_RE = /^(.*\D)\s+(\d{1,3})\s*[xX×*]\s*(\d[\d.,]*k?)\s*=\s*(\d[\d.,]*k?)$/
const ONE_LINE_QTY_RE = /^(.*\D)\s+(\d{1,3})\s+(\d[\d.,]*k?)\s+(\d[\d.,]*k?)$/i
const ONE_LINE_RE = /^(.*\D)\s+(\d[\d.,]*k?)$/i
/** Bố cục POS phổ biến: "Tên  đơn giá x SL  thành tiền". SL có thể bị OCR đọc sai hoặc mất, nên nhận mọi token. */
const ONE_LINE_UNIT_X_QTY_RE = /^(.*\D)\s+(\d[\d.,]*k?)\s*[xX×*]\s*(?:(\S+)\s+)?(\d[\d.,]*k?)$/i

function hit(re: RegExp, line: string): boolean {
  return re.test(fold(line))
}

/** Chuẩn hoá một dòng OCR: sửa lỗi O/l thành số ở chỗ dính với chữ số, gọn khoảng trắng. */
function normalizeLine(raw: string): string {
  return raw
    .replace(/(?<=\d)[Oo]|[Oo](?=\d)/g, '0')
    .replace(/(^|\s)[lI|](?=\d)/g, (_match, space: string) => `${space}1`)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Các số tiền (≥ 100 đồng) trên dòng, sau khi bỏ phần trăm. */
function moneyValues(line: string): number[] {
  const withoutPercent = line.replace(PERCENT_RE, ' ')
  const tokens = withoutPercent.match(MONEY_TOKEN_RE) ?? []
  return tokens
    .map((t) => parseMoney(t))
    .filter((v): v is number => v !== null && v >= 100)
}

function percentOf(line: string): number | undefined {
  const match = new RegExp(PERCENT_RE.source).exec(line)
  if (!match) return undefined
  const value = Math.round(Number(match[1].replace(',', '.')))
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : undefined
}

/** Khoản điều chỉnh trên một dòng: ưu tiên số tiền ghi trên bill (khớp đúng), không có thì lấy %. */
function adjustmentOf(line: string): ParsedAdjustment | undefined {
  const values = moneyValues(line)
  if (values.length > 0) return { mode: 'FIXED_AMOUNT', value: values[values.length - 1] }
  const pct = percentOf(line)
  if (pct !== undefined) return { mode: 'PERCENTAGE', value: pct }
  return undefined
}

function isAdjustmentLine(line: string): boolean {
  return hit(VAT_RE, line) || hit(SERVICE_RE, line) || hit(DISCOUNT_RE, line)
}

/** Dòng có ngày (dd/mm/yyyy hoặc "Ngày d tháng m năm yyyy") không phải món. */
function isDateLine(line: string): boolean {
  return /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(line) || /ngay\s*\d{1,2}\s*thang/.test(fold(line))
}

function isTotalLine(line: string): boolean {
  return hit(TOTAL_RE, line) && !hit(TOTAL_EXCLUDE_RE, line)
}

function findDate(lines: string[]): string | undefined {
  for (const line of lines) {
    const dmy = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/.exec(line)
    const words = /ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/.exec(fold(line))
    const match = words ?? dmy
    if (!match) continue
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    const ymd = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    if (isValidYmd(ymd) && isYmdInRange(ymd)) return ymd
  }
  return undefined
}

/** Tên quán: trong 4 dòng đầu không phải địa chỉ/tiêu đề, ưu tiên dòng có từ khoá và viết hoa. */
function findVendor(lines: string[]): string | undefined {
  let best: { name: string; score: number } | undefined
  for (const line of lines.slice(0, 4)) {
    if (hit(ADDRESS_RE, line) || hit(HEADER_RE, line) || !/[A-Za-zÀ-ỹ]/.test(line)) continue
    if (/\d{1,2}[/.-]\d{1,2}[/.-]\d/.test(line)) continue
    let score = 0
    if (hit(VENDOR_KEYWORD_RE, line)) score += 2
    const letters = line.replace(/[^A-Za-zÀ-ỹ]/g, '')
    const upper = letters.replace(/[^A-ZÀ-Ỹ]/g, '')
    if (letters.length > 0 && upper.length / letters.length >= 0.7) score += 1
    if (score > 0 && (!best || score > best.score)) {
      best = { name: line.replace(/[:-]+$/, '').trim(), score }
    }
  }
  return best?.name
}

function cleanItemName(raw: string): string | undefined {
  let name = raw.replace(/^\d{1,2}[.)]\s+/, '').trim()
  // Đuôi rác do OCR đọc đường kẻ/dấu chấm thành ": n :".
  for (let prev = ''; prev !== name; ) {
    prev = name
    name = name.replace(/\s+[:;|]\s*\S?$/, '').replace(/[:-]+$/, '').trim()
  }
  return /[A-Za-zÀ-ỹ]/.test(name) ? name : undefined
}

/** Dòng chỉ có chữ (không có số tiền): tên món, hoặc ghi chú như "Pha ngọt", "Khô". */
function isNameOnly(line: string): boolean {
  return /[A-Za-zÀ-ỹ]{2}/.test(line) && moneyValues(line).length === 0 && !line.includes('=')
}

/** Số lượng từ token OCR; nếu hỏng thì suy ra từ thành tiền / đơn giá. `uncertain` khi phải suy ra hoặc không khớp. */
function resolveQuantity(token: string | undefined, unit: number, amount: number): { quantity: number; uncertain: boolean } {
  const parsed = token !== undefined && /^\d{1,3}$/.test(token) ? Number(token) : undefined
  if (parsed !== undefined && parsed >= 1 && parsed * unit === amount) return { quantity: parsed, uncertain: false }
  if (unit > 0 && amount % unit === 0 && amount / unit >= 1 && amount / unit <= 999) {
    return { quantity: amount / unit, uncertain: parsed !== amount / unit }
  }
  return { quantity: parsed ?? 1, uncertain: true }
}

/**
 * Món từ một dòng (số lượng, đơn giá, thành tiền) hoặc hai dòng `tên` / `SL x đơn giá = thành tiền`.
 * Dòng chỉ có chữ ngay trước một dòng có giá được ghép làm phần đầu tên ("Trà Cóc" + "Pha ngọt").
 */
function parseItems(lines: string[], vendorName: string | undefined): ParsedItem[] {
  const items: ParsedItem[] = []
  /** Các dòng chỉ có chữ liên tiếp chưa gắn vào món nào. */
  let pending: string[] = []

  const push = (rawName: string, quantity: number, unitPrice: number, rawAmount: number, uncertain: boolean): void => {
    const own = cleanItemName(rawName)
    if (!own) return
    const prefix = pending.length > 0 ? cleanItemName(pending[pending.length - 1]) : undefined
    const name = prefix ? `${prefix} - ${own}` : own
    items.push({ name, quantity, unitPrice, rawAmount, uncertain: uncertain || quantity * unitPrice !== rawAmount })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isClassified =
      isAdjustmentLine(line) || isTotalLine(line) || isDateLine(line) || hit(ADDRESS_RE, line) || hit(HEADER_RE, line) || hit(FOOTER_RE, line)
    if (isClassified) {
      pending = []
      continue
    }

    // Bố cục hai dòng: dòng tiếp theo là "SL x đơn giá = thành tiền".
    const next = lines[i + 1]
    const pair = next ? QTY_PAIR_RE.exec(next) : null
    if (pair) {
      const unit = parseMoney(pair[2])
      const amount = parseMoney(pair[3])
      if (cleanItemName(line) && unit !== null && amount !== null) {
        push(line, Number(pair[1]), unit, amount, false)
        pending = []
        i++
        continue
      }
    }

    const oneLineEq = ONE_LINE_EQ_RE.exec(line)
    if (oneLineEq) {
      const quantity = Number(oneLineEq[2])
      const unit = parseMoney(oneLineEq[3])
      const amount = parseMoney(oneLineEq[4])
      if (quantity >= 1 && unit !== null && amount !== null) {
        push(oneLineEq[1], quantity, unit, amount, false)
        pending = []
      }
      continue
    }

    if (line.includes('=')) continue

    // "Tên  đơn giá x SL  thành tiền".
    const unitXQty = ONE_LINE_UNIT_X_QTY_RE.exec(line)
    if (unitXQty) {
      const unit = parseMoney(unitXQty[2])
      const amount = parseMoney(unitXQty[4])
      if (unit !== null && amount !== null && unit >= 100 && amount >= 100) {
        const { quantity, uncertain } = resolveQuantity(unitXQty[3], unit, amount)
        push(unitXQty[1], quantity, unit, amount, uncertain)
        pending = []
        continue
      }
    }

    // Bố cục một dòng: tên, số lượng, đơn giá, thành tiền.
    const withQty = ONE_LINE_QTY_RE.exec(line)
    if (withQty) {
      const quantity = Number(withQty[2])
      const unit = parseMoney(withQty[3])
      const amount = parseMoney(withQty[4])
      if (quantity >= 1 && unit !== null && amount !== null) {
        push(withQty[1], quantity, unit, amount, false)
        pending = []
      }
      continue
    }

    // Dòng chỉ có tên và một số cuối: coi như 1 phần.
    // Token rác (chữ + số, ví dụ "S022") dính trước số tiền do OCR đọc hỏng "đơn giá x SL".
    const single = ONE_LINE_RE.exec(line.replace(/\s+[A-Za-z]{1,2}\d{1,4}(?=\s+\d[\d.,]*k?$)/, ''))
    if (single) {
      const amount = parseMoney(single[2])
      if (amount !== null && amount >= 100) {
        push(single[1], 1, amount, amount, false)
        pending = []
      }
      continue
    }

    if (isNameOnly(line) && line !== vendorName) pending.push(line)
  }
  return items
}

/**
 * Bỏ "món" thực ra là dòng tổng bị đọc lệch chữ ("Tông Cộng", "Téng tiền"): số tiền bằng đúng tổng hoặc tiền hàng ghi
 * trên bill trong khi còn món khác. Một món duy nhất bằng tổng bill thì giữ (bill chỉ có một món).
 */
function dropTotalRows(items: ParsedItem[], billTotal?: number, billSubtotal?: number): ParsedItem[] {
  if (items.length < 2) return items
  const refs = [billTotal, billSubtotal].filter((v): v is number => v !== undefined)
  return items.filter((item) => !refs.includes(item.rawAmount))
}

/**
 * Số tiền ở các dòng có tiền cuối bill (mới nhất trước), tối đa `count` giá trị khác nhau. Dòng cuối thường là tổng bill
 * kể cả khi chữ "Tổng cộng" không đọc được; bỏ qua dòng ngày, địa chỉ/điện thoại và dòng phần trăm.
 */
export function trailingAmounts(rawText: string, count: number): number[] {
  const lines = rawText.split(/\r?\n/).map(normalizeLine).filter((line) => line.length > 0)
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

/** Phân tích văn bản OCR của một hoá đơn. Không ném lỗi: thứ không đọc được thì bỏ trống. */
export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line.length > 0)

  const vendorName = findVendor(lines)
  const result: ParsedReceipt = { items: parseItems(lines, vendorName) }

  const invoiceDate = findDate(lines)
  if (invoiceDate) result.invoiceDate = invoiceDate

  if (vendorName) result.vendorName = vendorName

  for (const line of lines) {
    if (hit(VAT_RE, line)) {
      const adj = adjustmentOf(line)
      if (adj) result.vat = adj
    } else if (hit(SERVICE_RE, line)) {
      const adj = adjustmentOf(line)
      if (adj) result.service = adj
    } else if (hit(DISCOUNT_RE, line)) {
      const adj = adjustmentOf(line)
      if (adj) result.discount = adj
    } else if (isTotalLine(line)) {
      const values = moneyValues(line)
      if (values.length > 0) result.billTotal = values[values.length - 1]
    } else if (hit(SUBTOTAL_RE, line)) {
      const values = moneyValues(line)
      if (values.length > 0) result.billSubtotal = values[values.length - 1]
    }
  }

  result.items = dropTotalRows(result.items, result.billTotal, result.billSubtotal)

  return result
}
