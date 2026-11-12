// Đọc dòng món (tên, số lượng, đơn giá, thành tiền).
import {
  ADDRESS_RE,
  COLUMN_INDEX_RE,
  FOOTER_RE,
  HEADER_RE,
  ITEM_NOTE_RE,
  LEADING_QTY_RE,
  LONG_NUMBER_LABEL_RE,
  NOTE_RE,
  ONE_LINE_EQ_RE,
  QTY_PAIR_RE,
  TOTAL_AMOUNT_RE,
  UNIT_COLUMN_RE,
  UNIT_WORDS,
  hit,
} from './patterns'
import { fold } from '../../lib/textFold'
import { isAdjustmentLine, isTotalLine } from './adjustments'
import { isDateLine } from './header'
import { isLongNumberLine, mergeThousandGroups, moneyValues } from './money'
import { parseMoney } from '../../lib/money'
import type { ParsedItem } from './types'

export function cleanItemName(raw: string): string | undefined {
  // Số thứ tự (STT) đầu dòng của bảng: "1 | Canh chua", "5 |Cơm", "_3._ Cải", "2. Bia".
  let name = raw.replace(/^[^\p{L}\p{N}]*\d{1,2}\s*(?:[.)]+[_\s]+|\|+\s*)/u, '').trim()
  // STT dính liền dấu chấm vào chữ: "1.SALMON", "11.Coke", "0.JAPANESE". Số đầu tên không có dấu chấm ("7 Up") giữ nguyên.
  name = name.replace(/^\d{1,3}\.(?=\p{L})/u, '')
  // Đuôi rác do OCR đọc đường kẻ/dấu chấm thành ": n :", và dấu câu rác ở hai đầu ("` Matcha", "NUI XÀO BO .").
  for (let prev = ''; prev !== name;) {
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
export function isNameOnly(line: string): boolean {
  return /[A-Za-zÀ-ỹ]{2}/.test(line) && moneyValues(line).length === 0 && !line.includes('=')
}

/** Token chỉ có dấu câu / gạch (đường kẻ, rác OCR như "_", "—>"): không phải chữ cũng không phải số. */
export const PUNCT_ONLY_RE = /^[^\p{L}\p{N}]+$/u
export const X_TOKEN_RE = /^[xX×*]$/
export const X_QTY_TOKEN_RE = /^[xX×*](\d{1,3})$/
/** Token rác chữ + số do OCR đọc hỏng cột "x SL" (ví dụ "S022"). */
export const JUNK_TOKEN_RE = /^[A-Za-z]{1,2}\d{1,4}$/
export const NUMBER_TOKEN_RE = /^\d[\d.,]*k?$/i
/** Số lượng thật chỉ có 1-2 chữ số; số lớn hơn là tiền. */
export const QTY_TOKEN_RE = /^\d{1,2}$/
/** Tên món không nên chứa số tiền: từ 3.000 đồng trở lên thì khả năng cao là số tiền bị hiểu nhầm (số nhỏ hơn như "1964" là tên món). */
export const BIG_NUMBER_MIN = 3000
/** Thành tiền một món dưới mức này (đồng) gần như chắc chắn là rác OCR (số điện thoại, số nhà...). */
export const MIN_ITEM_AMOUNT = 1000
/** Đơn giá tối thiểu của một dòng món có SL × đơn giá = thành tiền (dùng để nhận dòng món chắc chắn). */
export const MIN_UNIT_PRICE = 1000

export interface TailSplit {
  /** Phần chữ bên trái, chưa làm sạch. */
  name: string
  /** Các số ở đuôi dòng, từ trái sang phải, đã bỏ dấu "x" và token rác. */
  numbers: string[]
}

/**
 * Tách đuôi số của dòng món: đếm các số liên tiếp ở cuối (cột đơn giá / SL / thành tiền) trước, phần còn lại là tên.
 * Dấu "x" và token rác chen giữa các số được bỏ qua.
 */
export function splitTail(line: string): TailSplit | null {
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

export interface TailItem {
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
export function interpretTail(numbers: string[]): TailItem | null {
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

/** Bỏ từ đơn vị tính ở cuối tên (chỉ khi còn lại ít nhất một từ). */
export function dropTrailingUnit(name: string): string {
  const tokens = name.split(' ')
  if (tokens.length < 2 || !UNIT_WORDS.has(fold(tokens[tokens.length - 1]))) return name
  return tokens.slice(0, -1).join(' ')
}

/** Tên "món" thực ra là rác OCR (vùng mã QR, đường kẻ đọc thành chuỗi chữ số): quá dài hoặc phần lớn là token có chữ số. */
export function looksLikeJunk(name: string): boolean {
  if (name.length > 60) return true
  const tokens = name.split(' ')
  const withDigits = tokens.filter((t) => /\d/.test(t)).length
  return tokens.length >= 4 && withDigits / tokens.length > 0.4
}

/** Bỏ số lớn (≥ 1.000) khỏi tên món: đó là số tiền bị hiểu nhầm. Trả về tên đã bỏ và các số bị bỏ. */
export function stripBigNumbers(rawName: string): { name: string; hints: number[] } {
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

/** Số thứ tự đứng đầu dòng món: "1. SALMON", "8 Trà đào", "10) Ebi". */
export const STT_PREFIX_RE = /^\W*(\d{1,2})(?:\s*[.)]\s*|\s+)(?=\p{L})/u
/** Tiêu đề cột bảng món: "Tên món | SL | ĐG | Thành tiền" (cần ít nhất hai cột để không nhầm với một dòng món). */
export const COLUMN_HEADER_PARTS = [
  /ten mon|ten hang|\bmon\b/,
  /^sl\b|\bsl\b|so luong|quantity/,
  /\bdg\b|don gia|unit price/,
  /thanh tien|t\.?\s?tien|\bamount\b/,
]

/** Vị trí dòng tiêu đề cột: các món bắt đầu ngay sau nó, phần trên là thông tin đơn (ngày, bàn, thu ngân…). */
export function findItemsStart(lines: string[]): number {
  const at = lines.findIndex((line) => COLUMN_HEADER_PARTS.filter((re) => hit(re, line)).length >= 2)
  return at < 0 ? 0 : at + 1
}

export interface Numbering {
  /** Chỉ số các dòng bắt đầu bằng số thứ tự (STT). */
  rows: Map<number, number>
  /** Số thứ tự lớn nhất đọc được: gợi ý số món đã gọi. */
  count: number
}

/**
 * Nhận ra cột số thứ tự: các dòng bắt đầu bằng 1, 2, 3… tăng dần (cho nhảy tối đa 2 số khi OCR làm hỏng một dòng).
 * Cần ít nhất 3 dòng liên tiếp đúng thứ tự mới coi là STT, để "2 Bia 50.000" (số lượng) không bị nhầm.
 */
export function detectNumbering(lines: string[], from: number): Numbering | null {
  const rows = new Map<number, number>()
  let last = 0
  for (let i = from; i < lines.length; i++) {
    const n = Number(STT_PREFIX_RE.exec(lines[i])?.[1])
    if (n > last && n <= last + 3) {
      rows.set(i, n)
      last = n
    }
  }
  return rows.size >= 3 ? { rows, count: last } : null
}

/**
 * Món từ một dòng (số lượng, đơn giá, thành tiền) hoặc hai dòng `tên` / `SL x đơn giá = thành tiền`.
 * Dòng chỉ có chữ ngay trước một dòng có giá được ghép làm phần đầu tên ("Trà Cóc" + "Pha ngọt").
 */
/** Dòng tuỳ chọn của món ("- Hot 50 Oat", "+ Thêm đá"): bắt đầu bằng gạch / dấu cộng rồi tới chữ. */
export const OPTION_LINE_RE = /^\W*[-–—+•]\s*\p{L}/u
/** Dòng món 0 đồng: SL rồi hai cột "0" (OCR hay đọc "0" thành "o", "a", "ol"). */
export const ZERO_ROW_RE = /\s\d{1,2}\s+[0oOaA]l?\s+[0oOaA]l?$/

/** Dòng không tính tiền: tuỳ chọn của món không kèm giá, hoặc món tặng 0 đồng. Bỏ qua, không ghép vào tên món khác. */
export function isFreeRow(line: string): boolean {
  if (hit(ZERO_ROW_RE, line)) return true
  return OPTION_LINE_RE.test(line) && moneyValues(line).length === 0
}

/**
 * Thành tiền bị nhoè chỉ còn nhóm số 0 ("3 99.000 000"): thay bằng SL × đơn giá để không mất cả món. Trả `true` nếu đã thay;
 * món được đánh dấu cần xem lại.
 */
export function repairBlankAmount(numbers: string[]): boolean {
  if (numbers.length < 3 || !/^0{2,3}$/.test(numbers[numbers.length - 1])) return false
  const q = parseMoney(numbers[numbers.length - 3])
  const unit = parseMoney(numbers[numbers.length - 2])
  if (q === null || unit === null || q < 1 || q > 99 || unit < MIN_UNIT_PRICE) return false
  numbers[numbers.length - 1] = String(q * unit)
  return true
}

/** Ba số cuối dòng là SL, đơn giá, thành tiền và khớp phép nhân (đơn giá ≥ 1.000). */
export function isStrongItemRow(line: string): boolean {
  const tail = splitTail(line)
  if (!tail || tail.numbers.length < 3 || !cleanItemName(tail.name)) return false
  const [q, unit, amount] = tail.numbers.slice(-3).map((n) => parseMoney(n))
  return q !== null && unit !== null && amount !== null && q >= 1 && q <= 99 && unit >= MIN_UNIT_PRICE && q * unit === amount
}

export function parseItems(
  lines: string[],
  vendorName: string | undefined,
  origins?: Map<ParsedItem, number>,
  layout: { start: number; boundaries: Set<number>; numbering: Numbering | null } = { start: 0, boundaries: new Set(), numbering: null },
  sttRead?: Set<number>,
): ParsedItem[] {
  const items: ParsedItem[] = []
  // Bảng có cột "Đơn vị tính": từ đơn vị (Lẩu, Dĩa, Thố…) đứng cuối tên món, không thuộc tên.
  const unitColumn = lines.some((l) => hit(UNIT_COLUMN_RE, l))
  /** Các dòng chỉ có chữ liên tiếp chưa gắn vào món nào. */
  let pending: string[] = []
  /** Dòng đang đọc, ghi lại làm vị trí của món để gắn món vào nhóm Drink / Food. */
  let current = 0
  /** Món vừa đọc: dòng chữ không có giá ngay sau nó là phần tên bị xuống dòng ("SALMON" + "SASIMI"). */
  let last: ParsedItem | undefined
  const { start, boundaries, numbering } = layout
  const blockMode = boundaries.size > 0 || numbering !== null

  const push = (rawName: string, quantity: number, unitPrice: number, rawAmount: number, uncertain: boolean): void => {
    const { name: strippedName, hints } = stripBigNumbers(rawName)
    // Bảng có cột STT nhưng không có đường kẻ: "1 Canh chua" → STT dính vào tên.
    const cleaned = cleanItemName(unitColumn ? strippedName.replace(/^\d{1,2}\s+(?=\p{L})/u, '') : strippedName)
    const own = cleaned && unitColumn ? dropTrailingUnit(cleaned) : cleaned
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
    const item: ParsedItem = { name, quantity, unitPrice, rawAmount, uncertain: flagged || quantity * unitPrice !== rawAmount }
    items.push(item)
    last = item
    const sttNumber = numbering?.rows.get(current)
    if (sttNumber !== undefined) sttRead?.add(sttNumber)
    origins?.set(item, current)
  }

  // Hoá đơn điện tử dạng bảng: các món nằm trước dòng "Cộng tiền hàng hóa… (Total amount)"; phần sau là chữ ký số, mã tra cứu…
  const tableMode = unitColumn || lines.some((l) => hit(TOTAL_AMOUNT_RE, l))

  for (let i = start; i < lines.length; i++) {
    // Số thứ tự đầu dòng không thuộc tên món; nó chỉ cho biết bill đã gọi bao nhiêu món.
    const line = numbering?.rows.has(i) ? lines[i].replace(STT_PREFIX_RE, '') : lines[i]
    current = i
    // Gạch phân cách: món mới bắt đầu, dòng chữ trước đó không còn dính vào món nào.
    if (boundaries.has(i)) {
      pending = []
      last = undefined
    }
    if (tableMode && items.length > 0 && (hit(TOTAL_AMOUNT_RE, line) || hit(/^\W*cong tien/, line))) break
    // Dòng có đủ "SL đơn giá thành tiền" khớp phép nhân là một món, kể cả khi tên lẫn chữ giống từ khoá tiêu đề / chân trang
    // (OCR đọc chữ Hàn trong ngoặc thành "BAN", "The"…).
    const strongRow = isStrongItemRow(line)
    const isClassified =
      isAdjustmentLine(line) ||
      isTotalLine(line) ||
      isDateLine(line) ||
      hit(ADDRESS_RE, line) ||
      (!strongRow && (hit(HEADER_RE, line) || hit(FOOTER_RE, line))) ||
      hit(COLUMN_INDEX_RE, line) ||
      hit(NOTE_RE, line) ||
      hit(ITEM_NOTE_RE, line) ||
      isLongNumberLine(line) ||
      hit(LONG_NUMBER_LABEL_RE, line) ||
      isFreeRow(line)
    if (isClassified) {
      pending = []
      last = undefined
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
    const leading = LEADING_QTY_RE.exec(line)
    const tail = splitTail(leading ? line.slice(leading[0].length) : line)
    const repaired = tail ? repairBlankAmount(tail.numbers) : false
    const tailItem = tail ? interpretTail(tail.numbers) : null
    if (tail && tailItem) {
      // SL bị OCR đọc thành một chữ ("HITO ROLL J 139.000 139.000"): hai tiền bằng nhau nghĩa là SL 1, chữ đó bỏ khỏi tên.
      // Không bỏ "I" hay "L" vì có thể là tên thật (cỡ L, Combo I).
      const letterQty = tail.numbers.length === 2 && tail.numbers[0] === tail.numbers[1] ? /\s[Jl|]$/ : null
      const name = [letterQty ? tail.name.replace(letterQty, '') : tail.name, ...tailItem.extra].join(' ')
      let { quantity, unitPrice, uncertain } = tailItem
      if (repaired) uncertain = true
      // "1x Cà phê sữa 25.000": một số tiền duy nhất là thành tiền của cả dòng.
      if (leading && tail.numbers.length === 1) {
        const q = Number(leading[1])
        if (q >= 1 && tailItem.amount % q === 0) {
          quantity = q
          unitPrice = tailItem.amount / q
        } else uncertain = true
      }
      push(name, quantity, unitPrice, tailItem.amount, uncertain)
      pending = []
      continue
    }

    if (isNameOnly(line) && line !== vendorName) {
      // Giữ ngoặc đầu dòng: "(BÁNH XÈO NHẬT)" là phần chú thích của món. Dòng có STT ("13 Miso") là món mới, không phải phần tiếp của tên trước.
      const isNumberedRow = numbering?.rows.has(i) || STT_PREFIX_RE.test(lines[i])
      const continuation = blockMode && last !== undefined && !isNumberedRow && cleanItemName(line) ? line.replace(/[^\p{L}\p{N})]+$/u, '').trim() : undefined
      if (last && continuation) last.name = `${last.name} ${continuation}`
      else pending.push(line)
    }
  }
  return items
}

/** Tên món (02 §3 bước 11): số ở cuối tên tối đa 4 chữ số ("Bia 1964"); số dài hơn 4 chữ số là mã hoặc số tiền bị đọc nhầm, bỏ hết. */
export function tidyItemName(item: ParsedItem): ParsedItem {
  const name = item.name.replace(/(\s+\d+)+$/, (tail) => (/\d{5}/.test(tail) ? '' : tail)).trim()
  return name === item.name ? item : { ...item, name }
}

/** Đọc món theo bố cục bill: bỏ phần thông tin đơn phía trên tiêu đề cột, dùng gạch phân cách và số thứ tự để chia món. */
export function readItems(
  lines: string[],
  vendorName: string | undefined,
  origins: Map<ParsedItem, number>,
  boundaries: Set<number>,
  sttRead: Set<number>,
): ParsedItem[] {
  const start = findItemsStart(lines)
  const read = (from: number): ParsedItem[] =>
    parseItems(lines, vendorName, origins, { start: from, boundaries, numbering: detectNumbering(lines, from) }, sttRead)
  const items = read(start)
  // Tiêu đề cột đoán sai (không có món nào sau nó): đọc lại từ đầu như bill không có tiêu đề.
  return items.length === 0 && start > 0 ? read(0) : items
}
