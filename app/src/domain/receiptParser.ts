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
const ADDRESS_RE = /^\W*dc\b|d\/c|dia chi|sdt|\btel\b|hotline|phone|\bmst\b|ma so|website|www\./
/** Tiêu đề và chân trang của bill. */
const HEADER_RE = /hoa don|phieu|receipt|ten mon|ten hang|don gia|thanh tien|^sl\b|\bban\b|table|cam on|hen gap|thank|nhan vien|thu ngan|gio vao|gio ra|gio in|\bin:/
const FOOTER_RE = /^\W*t[oe0]ng\b|\bsub ?total\b|\bgrand\b|tong|tam tinh|tien mat|tien thua|tien thoi|thanh toan|tien hang|\bthe\b|card|cash|change/

const VENDOR_KEYWORD_RE = /nha hang|quan\b|cafe|coffee|\blau\b|bbq|\bbill\b|restaurant|karaoke|\btra\b|\bbar\b|buffet|\bcom\b|\bpho\b|\bbun\b|bistro|kitchen/

const QTY_PAIR_RE = /^(\d{1,3})\s*[xX×*]\s*(\d[\d.,]*k?)\s*=\s*(\d[\d.,]*k?)$/i
/** Tên, số lượng, đơn giá và thành tiền trên cùng một dòng: "Lẩu bò 2 x 150.000 = 300.000". */
const ONE_LINE_EQ_RE = /^(.*\S)\s+(\d{1,3})\s*[xX×*]\s*(\d[\d.,]*k?)\s*=\s*(\d[\d.,]*k?)$/

function hit(re: RegExp, line: string): boolean {
  return re.test(fold(line))
}

/** Chuẩn hoá một dòng OCR: sửa lỗi O/l thành số ở chỗ dính với chữ số, gọn khoảng trắng. */
function normalizeLine(raw: string): string {
  return raw
    .replace(/(?<=\d)[Oo]|[Oo](?=\d)/g, '0')
    .replace(/(^|\s)[lI|](?=\d)/g, (_match, space: string) => `${space}1`)
    // OCR đọc dấu phân cách nghìn thành "/" hoặc dấu nháy: 85/000, 49'000.
    .replace(/(\d)[/'’](\d{3})(?!\d)/g, '$1,$2')
    .replace(/\S+/g, fixDigitLookalikes)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Số tiền có nhóm nghìn mà OCR đọc lẫn chữ giống số ("§9,000", "5S,000", "l0.000"): đổi lại thành chữ số. */
const LOOKALIKE_MONEY_RE = /^[\dOoSs§BlI|]{1,3}[.,][\dOo]{3}$/
function fixDigitLookalikes(token: string): string {
  if (!LOOKALIKE_MONEY_RE.test(token) || (token.match(/\d/g) ?? []).length < 3) return token
  return token.replace(/[Oo]/g, '0').replace(/[Ss§]/g, '5').replace(/B/g, '8').replace(/[lI|]/g, '1')
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
  // Đuôi rác do OCR đọc đường kẻ/dấu chấm thành ": n :", và dấu câu rác ở hai đầu ("` Matcha", "NUI XÀO BO .").
  for (let prev = ''; prev !== name; ) {
    prev = name
    name = name
      .replace(/\s+[:;|]\s*\S?$/, '')
      // Cột "x SL" bị OCR làm dính vào tên khi số sau nó hỏng.
      .replace(/\s+[xX×]\s*\d{0,3}$/, '')
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/[^\p{L}\p{N})]+$/u, '')
      .trim()
  }
  return /[A-Za-zÀ-ỹ]/.test(name) ? name : undefined
}

/** Dòng chỉ có chữ (không có số tiền): tên món, hoặc ghi chú như "Pha ngọt", "Khô". */
function isNameOnly(line: string): boolean {
  return /[A-Za-zÀ-ỹ]{2}/.test(line) && moneyValues(line).length === 0 && !line.includes('=')
}

/** Token chỉ có dấu câu / gạch (đường kẻ, rác OCR như "_", "—>"): không phải chữ cũng không phải số. */
const PUNCT_ONLY_RE = /^[^\p{L}\p{N}]+$/u
const X_TOKEN_RE = /^[xX×*]$/
const X_QTY_TOKEN_RE = /^[xX×*](\d{1,3})$/
/** Token rác chữ + số do OCR đọc hỏng cột "x SL" (ví dụ "S022"). */
const JUNK_TOKEN_RE = /^[A-Za-z]{1,2}\d{1,4}$/
const NUMBER_TOKEN_RE = /^\d[\d.,]*k?$/i
/** Số lượng thật chỉ có 1-2 chữ số; số lớn hơn là tiền. */
const QTY_TOKEN_RE = /^\d{1,2}$/
/** Tên món không nên chứa số tiền: từ 1.000 đồng trở lên thì khả năng cao là số tiền bị hiểu nhầm. */
const BIG_NUMBER_MIN = 1000
/** Thành tiền một món dưới mức này (đồng) gần như chắc chắn là rác OCR (số điện thoại, số nhà...). */
const MIN_ITEM_AMOUNT = 1000

/** Gộp nhóm nghìn bị OCR tách bởi khoảng trắng: "49 000" → "49,000", "1 250 000" → "1,250,000". */
function mergeThousandGroups(tokens: string[]): string[] {
  const out: string[] = []
  for (const token of tokens) {
    const last = out[out.length - 1]
    if (last !== undefined && /^\d{3}$/.test(token) && /^\d{1,3}(,\d{3})*$/.test(last)) out[out.length - 1] = `${last},${token}`
    else out.push(token)
  }
  return out
}

interface TailSplit {
  /** Phần chữ bên trái, chưa làm sạch. */
  name: string
  /** Các số ở đuôi dòng, từ trái sang phải, đã bỏ dấu "x" và token rác. */
  numbers: string[]
}

/**
 * Tách đuôi số của dòng món: đếm các số liên tiếp ở cuối (cột đơn giá / SL / thành tiền) trước, phần còn lại là tên.
 * Dấu "x" và token rác chen giữa các số được bỏ qua.
 */
function splitTail(line: string): TailSplit | null {
  const tokens = mergeThousandGroups(line.split(' '))
  let end = tokens.length
  const numbers: string[] = []
  while (end > 0) {
    const token = tokens[end - 1]
    const xQty = X_QTY_TOKEN_RE.exec(token)
    if (X_TOKEN_RE.test(token) || PUNCT_ONLY_RE.test(token)) end--
    else if (xQty) {
      numbers.unshift(xQty[1])
      end--
    } else if (NUMBER_TOKEN_RE.test(token)) {
      numbers.unshift(token)
      end--
    } else if (numbers.length > 0 && JUNK_TOKEN_RE.test(token)) end--
    else break
  }
  if (numbers.length === 0) return null
  return { name: tokens.slice(0, end).join(' '), numbers }
}

interface TailItem {
  quantity: number
  unitPrice: number
  amount: number
  uncertain: boolean
  /** Số đứng trước các cột tiền, thuộc về tên món ("Phở 2" + "tô"…). */
  extra: string[]
}

/**
 * Suy ra số lượng, đơn giá, thành tiền từ các số ở đuôi dòng, dựa trên SỐ CỘT đếm được:
 * 1 số = thành tiền; 2 số = (đơn giá, thành tiền) hoặc (SL, thành tiền); 3 số = SL / đơn giá / thành tiền theo thứ tự nào
 * cũng được. Thành tiền luôn là số cuối. Từ 4 số trở lên: chỉ lấy 3 số cuối, số thừa trả về cho tên.
 */
function interpretTail(numbers: string[]): TailItem | null {
  const extra = numbers.slice(0, Math.max(0, numbers.length - 3))
  const cols = numbers.slice(-3)
  const values = cols.map((t) => parseMoney(t))
  if (values.some((v) => v === null)) return null
  const amount = values[values.length - 1] as number
  if (amount < MIN_ITEM_AMOUNT) return null
  const isQty = (i: number): boolean => QTY_TOKEN_RE.test(cols[i]) && (values[i] as number) >= 1

  if (cols.length === 1) return { quantity: 1, unitPrice: amount, amount, uncertain: false, extra }

  if (cols.length === 2) {
    const first = values[0] as number
    if (isQty(0)) {
      // "Phở bò 2 60.000": SL hay số trong tên? Ưu tiên SL khi chia hết, nhưng đánh dấu để xem lại.
      if (amount % first === 0) return { quantity: first, unitPrice: amount / first, amount, uncertain: true, extra }
      return { quantity: 1, unitPrice: amount, amount, uncertain: false, extra: [...extra, cols[0]] }
    }
    if (first < 100) return null
    if (amount % first === 0 && amount / first <= 999) return { quantity: amount / first, unitPrice: first, amount, uncertain: false, extra }
    return { quantity: 1, unitPrice: first, amount, uncertain: true, extra }
  }

  const [v1, v2] = values as [number, number, number]
  let quantity: number
  let unitPrice: number
  if (isQty(0) && isQty(1)) {
    // Hai số nhỏ liền nhau: số đầu thuộc về tên, còn lại là (SL, thành tiền) như trường hợp hai số.
    const rest = interpretTail(numbers.slice(-2))
    return rest ? { ...rest, extra: [...extra, cols[0]] } : null
  }
  if (isQty(0)) {
    quantity = v1
    unitPrice = v2
  } else if (isQty(1)) {
    unitPrice = v1
    quantity = v2
  } else if (amount % v2 === 0 && amount / v2 <= 999) {
    unitPrice = v2
    quantity = amount / v2
  } else if (amount % v1 === 0 && amount / v1 <= 999) {
    unitPrice = v1
    quantity = amount / v1
  } else {
    unitPrice = v2
    quantity = 1
  }
  return { quantity, unitPrice, amount, uncertain: quantity * unitPrice !== amount, extra }
}

/** Tên "món" thực ra là rác OCR (vùng mã QR, đường kẻ đọc thành chuỗi chữ số): quá dài hoặc phần lớn là token có chữ số. */
function looksLikeJunk(name: string): boolean {
  if (name.length > 60) return true
  const tokens = name.split(' ')
  const withDigits = tokens.filter((t) => /\d/.test(t)).length
  return tokens.length >= 4 && withDigits / tokens.length > 0.4
}

/** Bỏ số lớn (≥ 1.000) khỏi tên món: đó là số tiền bị hiểu nhầm. Trả về tên đã bỏ và các số bị bỏ. */
function stripBigNumbers(rawName: string): { name: string; hints: number[] } {
  const hints: number[] = []
  const kept = rawName.split(' ').filter((token) => {
    if (!NUMBER_TOKEN_RE.test(token)) return true
    const value = parseMoney(token)
    if (value === null || value < BIG_NUMBER_MIN) return true
    hints.push(value)
    return false
  })
  return { name: kept.join(' '), hints }
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
    const { name: strippedName, hints } = stripBigNumbers(rawName)
    const own = cleanItemName(strippedName)
    if (!own || looksLikeJunk(own)) return
    let flagged = uncertain
    // Số lớn trong tên là số tiền bị đọc nhầm vào tên: dùng nó để sửa dòng nếu làm SL × đơn giá = thành tiền khớp.
    if (hints.length > 0 && quantity * unitPrice !== rawAmount) {
      const unitHint = hints.find((h) => quantity * h === rawAmount)
      const amountHint = hints.find((h) => quantity * unitPrice === h)
      if (unitHint !== undefined) unitPrice = unitHint
      else if (amountHint !== undefined) rawAmount = amountHint
    }
    if (hints.length > 0) flagged = true
    const prefixRaw = pending.length > 0 ? pending[pending.length - 1] : undefined
    const prefix = prefixRaw !== undefined ? cleanItemName(stripBigNumbers(prefixRaw).name) : undefined
    const name = prefix ? `${prefix} - ${own}` : own
    items.push({ name, quantity, unitPrice, rawAmount, uncertain: flagged || quantity * unitPrice !== rawAmount })
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

    // Một dòng: đếm các số ở đuôi (cột tiền) trước, rồi suy ra đơn giá / SL / thành tiền, phần còn lại là tên.
    const tail = splitTail(line)
    const tailItem = tail ? interpretTail(tail.numbers) : null
    if (tail && tailItem) {
      const name = [tail.name, ...tailItem.extra].join(' ')
      push(name, tailItem.quantity, tailItem.unitPrice, tailItem.amount, tailItem.uncertain)
      pending = []
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
