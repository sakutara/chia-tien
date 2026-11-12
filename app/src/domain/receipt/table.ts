// Bảng hàng hoá của hoá đơn GTGT (có cột STT).
import { ADDRESS_RE, COLUMN_INDEX_RE, HEADER_RE, NOTE_RE, PERCENT_RE, UNIT_COLUMN_RE, hit } from './patterns'
import { MIN_ITEM_AMOUNT, NUMBER_TOKEN_RE, PUNCT_ONLY_RE, cleanItemName, interpretTail, isNameOnly } from './items'
import { dropZeroDecimals, mergeThousandGroups } from './money'
import { fold } from '../../lib/textFold'
import { parseMoney } from '../../lib/money'
import { t } from '../../i18n'
import type { ParsedItem } from './types'

// ---------------------------------------------------------------------------
// Bảng hàng hoá của hoá đơn GTGT (Grab, khách sạn, nhà hàng xuất hoá đơn đỏ)
// ---------------------------------------------------------------------------

export const TABLE_HEAD_RE = /\bstt\b/
export const TABLE_HEAD_NAME_RE = /ten hang|ten dich vu|description|dien giai|noi dung/
/** Dòng kết thúc bảng: tổng cộng, thuế, số tiền bằng chữ, chữ ký. */
export const TABLE_END_RE = /^\W*(?:tong\b|cong tien|so tien viet bang chu|thue suat|nguoi mua|nguoi ban)|\btotal\b|amount in words/
/** Tên dòng là khoản giảm trừ: chiết khấu, giảm giá, khuyến mại. */
export const TABLE_DISCOUNT_RE = /chiet khau|giam gia|khuyen mai|discount|\bgiam\b/
/** Mã chuyến / mã đơn đứng riêng một dòng (xuống dòng của tên hàng): "9TCF6T2GW6FDAV". */
export const CODE_LINE_RE = /^[A-Z0-9][A-Z0-9-]{7,}$/
export const STT_ROW_RE = /^[|_\s]*(\d{1,3})(?:\s*[|.)]+\s*|\s+)(.*)$/u
export const MIN_TABLE_AMOUNT = 100
/** Cột thuế suất ghi chữ thay vì số: "KCT", "KKKNT". */
export const TAX_WORD_TOKEN_RE = /^(?:kct|kkknt|ko|\d+%)$/i

export interface TableRow {
  quantity: number
  unitPrice: number
  amount: number
  /** Giá trị cột "Thành tiền" đã gồm thuế (có cột tiền thuế = thành tiền − trước thuế). */
  inclusive: boolean
  uncertain: boolean
  /** Phần chữ của dòng (tên hàng và đơn vị tính, chưa tách). */
  text: string
  negative: boolean
}

/** (SL, đơn giá, thành tiền) thoả SL × đơn giá = thành tiền; thành tiền xét từ trái sang phải để lấy cột "trước thuế" trước cột "sau thuế". */
export function findTriple(values: number[]): { iq: number; iu: number; ia: number } | null {
  for (let ia = 2; ia < values.length; ia++) {
    if (values[ia] < MIN_TABLE_AMOUNT) continue
    for (let iu = 1; iu < ia; iu++) {
      for (let iq = 0; iq < iu; iq++) {
        const q = values[iq]
        if (Number.isInteger(q) && q >= 1 && q <= 999 && q * values[iu] === values[ia]) return { iq, iu, ia }
      }
    }
  }
  return null
}

export function parseTableRow(rest: string): TableRow | null {
  let text = dropZeroDecimals(rest)
  const negative = /(?:^|\s)[-–−]\s?\d[\d.,]*(?:\s*[₫đ])?\s*$/.test(text) || /\(\s*\d[\d.,]*\s*\)\s*$/.test(text)
  text = text
    .replace(PERCENT_RE, ' ')
    .replace(/(^|\s)[-–−]\s?(?=\d)/g, '$1')
    .replace(/[()]/g, ' ')
    .replace(/(?<=\d)[₫đ]|(?<=\s)[₫đ](?=\s|$)/g, ' ')
  const tokens = mergeThousandGroups(text.split(/\s+/).filter(Boolean))
  let end = tokens.length
  const numbers: string[] = []
  while (end > 0) {
    const token = tokens[end - 1]
    if (NUMBER_TOKEN_RE.test(token)) numbers.unshift(token)
    else if (!(TAX_WORD_TOKEN_RE.test(token) || PUNCT_ONLY_RE.test(token))) break
    end--
  }
  if (numbers.length === 0) return null
  const values = numbers.map((n) => parseMoney(n))
  if (values.some((v) => v === null)) return null
  const vals = values as number[]
  const head = tokens.slice(0, end)

  const triple = findTriple(vals)
  if (triple) {
    const { iq, iu, ia } = triple
    const after = vals.slice(ia + 1)
    const gross = after[after.length - 1]
    const taxIndex = after.findIndex((v, i) => i < after.length - 1 && vals[ia] + v === gross)
    const inclusive = gross !== undefined && taxIndex >= 0
    const quantity = vals[iq]
    const amount = inclusive ? gross : vals[ia]
    const exact = amount % quantity === 0
    return {
      quantity,
      unitPrice: exact ? amount / quantity : vals[iu],
      amount,
      inclusive,
      uncertain: !exact,
      text: [...head, ...numbers.slice(0, iq)].join(' '),
      negative,
    }
  }

  const tail = interpretTail(numbers)
  if (!tail) return null
  return {
    quantity: tail.quantity,
    unitPrice: tail.unitPrice,
    amount: tail.amount,
    inclusive: false,
    uncertain: true,
    text: [...head, ...tail.extra].join(' '),
    negative,
  }
}

export interface TableParse {
  items: ParsedItem[]
  /** Tổng các dòng giảm trừ (chiết khấu, giảm giá) trong bảng. */
  discount: number
  vatIncluded: boolean
  /** Chỉ số các dòng đã dùng (dòng món và dòng tên xuống dòng) để các bước khác không đọc lại. */
  consumed: Set<number>
  rows: { expected: number; read: number; unread: string[] }
}

/** Bỏ mã chuyến / mã đơn dính sau tên ("Cước phí vận chuyển mã A-") rồi làm sạch. */
export function tableItemName(raw: string): string | undefined {
  const stripped = raw.replace(/\s+m[aã]\s+[A-Za-z0-9]{0,3}-?\s*$/iu, '').replace(/\s+[-–]\s*$/, '')
  return cleanItemName(stripped)
}

/**
 * Đọc bảng hàng hoá có cột STT: mỗi dòng số thứ tự là một món. Tên hàng có thể xuống dòng trước hoặc sau dòng số
 * (bố cục Grab), cột "Đơn vị tính" nằm giữa tên và số lượng. Dòng đánh số bị bỏ sót được đếm lại (`rows`) để cảnh báo thiếu món.
 * Trả `null` khi bill không có bảng như vậy (bill quán ăn thường).
 */
export function parseVatTable(lines: string[]): TableParse | null {
  const head = lines.findIndex((l, i) => hit(TABLE_HEAD_RE, l) && lines.slice(i, i + 3).some((x) => hit(TABLE_HEAD_NAME_RE, x)))
  if (head < 0) return null
  const unitCol = lines.some((l) => hit(UNIT_COLUMN_RE, l))

  const items: ParsedItem[] = []
  const consumed = new Set<number>()
  const unread: string[] = []
  let discount = 0
  let vatIncluded = false
  let expected = 0
  let read = 0
  let pending: Array<{ index: number; text: string }> = []

  for (let i = head + 1; i < lines.length; i++) {
    const line = lines[i]
    if (read + unread.length > 0 && hit(TABLE_END_RE, line)) break
    const stt = hit(COLUMN_INDEX_RE, line) ? null : STT_ROW_RE.exec(line)
    const sttNumber = stt ? Number(stt[1]) : 0
    // Cho phép nhảy tối đa 2 số (một dòng đánh số bị OCR đọc hỏng) thay vì mất hết các dòng sau nó.
    let row = stt !== null && sttNumber > expected && sttNumber <= expected + 3 ? parseTableRow(stt[2]) : null
    // Dòng đánh số cột ("1 2 3 4 5") không có chữ và không có số tiền thật: không phải một dòng hàng.
    if (stt && !/\p{L}/u.test(stt[2]) && pending.length === 0 && (!row || row.amount < MIN_ITEM_AMOUNT)) row = null
    const isRowNumber = stt !== null && sttNumber > expected && sttNumber <= expected + 3 && (row !== null || /\p{L}/u.test(stt[2]) || pending.length > 0)

    if (!isRowNumber) {
      // Dòng không có STT: tên xuống dòng (trước dòng số), mã chuyến (sau dòng số), hoặc rác.
      if (hit(HEADER_RE, line) || hit(NOTE_RE, line) || hit(ADDRESS_RE, line) || hit(COLUMN_INDEX_RE, line)) pending = []
      else if (CODE_LINE_RE.test(line) && /\d/.test(line)) consumed.add(i)
      // Dòng có ngoặc đóng thừa ("VAT)") là phần cuối của tiêu đề cột bị xuống dòng, không phải tên hàng.
      else if (isNameOnly(line) && !line.startsWith('(') && !/:\s*\S/.test(line) && (line.match(/\)/g) ?? []).length <= (line.match(/\(/g) ?? []).length)
        pending.push({ index: i, text: line })
      continue
    }

    for (let missing = expected + 1; missing < sttNumber; missing++) unread.push(t('STT {n}: không đọc được dòng này', { n: missing }))
    expected = sttNumber
    if (!row || row.amount < MIN_TABLE_AMOUNT) {
      unread.push(t('STT {n}: {text}', { n: sttNumber, text: stt[2] }))
      pending = []
      continue
    }

    const segment = row.text.split(/\s+/).filter(Boolean)
    const prefix = pending
      .slice(-2)
      .map((p) => p.text)
      .join(' ')
    // Có tên xuống dòng phía trên thì phần chữ trên dòng số chỉ là đơn vị tính ("Chuyến"); không thì tên nằm trên dòng số.
    const ownTokens = prefix !== '' && segment.length <= 2 ? [] : unitCol && segment.length >= 2 ? segment.slice(0, -1) : segment
    const name = tableItemName([prefix, ...ownTokens].filter((x) => x !== '').join(' '))
    pending.forEach((p) => consumed.add(p.index))
    consumed.add(i)
    pending = []
    if (!name) {
      unread.push(t('STT {n}: {text}', { n: sttNumber, text: stt[2] }))
      continue
    }

    read++
    if (row.inclusive) vatIncluded = true
    if (row.negative || TABLE_DISCOUNT_RE.test(fold(name))) {
      discount += row.amount
      continue
    }
    items.push({ name, quantity: row.quantity, unitPrice: row.unitPrice, rawAmount: row.amount, uncertain: row.uncertain })
  }

  if (expected === 0) return null
  return { items, discount, vatIncluded, consumed, rows: { expected, read, unread } }
}
