import { isValidYmd, isYmdInRange } from '../lib/dates'
import { parseMoney } from '../lib/money'
import { fold } from '../lib/textFold'
import { t } from '../i18n'

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
  /** Đơn giá / thành tiền từng dòng đã gồm VAT (hoá đơn GTGT ghi cột "Thành tiền" sau thuế): không cộng VAT lần nữa. */
  vatIncluded?: boolean
  /** Đếm số dòng của bảng hàng hoá để phát hiện thiếu món: `expected` dòng đánh số trên bill, `read` dòng đọc được. */
  tableRows?: { expected: number; read: number; unread: string[] }
  /** Bill có dòng tổng nhóm (Drink / Food): nhóm mà tổng các món đọc được khác số trên dòng nhóm (`group` bỏ trống: đối soát chung). */
  groupChecks?: Array<{ group?: 'drink' | 'food'; expected: number; read: number }>
}

const PERCENT_RE = /(\d{1,2}(?:[.,]\d)?)\s*%/g
const MONEY_TOKEN_RE = /\d[\d.,]*k?/gi

const VAT_RE = /\b(vat|gtgt|thue)\b/
/** Dòng nhắc tới thuế nhưng không phải khoản VAT: mã số thuế, cơ quan thuế, tra cứu thuế. */
const TAX_ID_RE = /ma so thue|\bmst\b|tax code|tax id|co quan thue/
const SERVICE_RE = /phi phuc vu|phuc vu|phi dv|service/
const DISCOUNT_RE = /giam gia|chiet khau|khuyen mai|discount|\bck\b/
/** Phí giao hàng và các phụ phí của app giao đồ ăn (không phải món): cộng dồn vào phí phục vụ. */
const EXTRA_FEE_RE = /phi giao hang|phi van chuyen|phi ap dung|phi nen tang|phi ship|delivery fee|shipping/
/** Dòng ghi chú / tuỳ chọn của một món trên đơn app ("Ghi chú: Ít đá", "Size L"): không phải tên món, cũng không ghép vào tên món sau. */
const ITEM_NOTE_RE = /^\W*(?:ghi chu|note)\b|^\W*size\b/
/** Số lượng đứng trước tên món: "1x Cà phê sữa". */
/** Cho phép tối đa hai token rác ngắn đứng trước (ảnh món bị OCR đọc thành "là.", "Pi"). */
const LEADING_QTY_RE = /^(?:\S{1,3}\s+){0,2}?\W*(\d{1,2})\s*[xX×]\s+(?=\p{L})/u
const TOTAL_RE = /t[oe]ng cong|t[oe]ng thanh toan|t[oe]ng tien|can thanh toan|thanh toan|con phai thu|total|\bamount\b/
/** Dòng tiền hàng / tạm tính: tổng các món, chưa gồm giảm giá, phí phục vụ, VAT. */
const SUBTOTAL_RE = /tong \(\d+ mon\)|tien hang|tong tam tinh|tam tinh|sub ?total|cong tien/
const TOTAL_EXCLUDE_RE = /tien hang|tam tinh|tien mat|tien thua|tien thoi|\bthe\b|card|cash/

/** Dòng địa chỉ, điện thoại, mã số thuế: không phải tên quán cũng không phải món. */
const ADDRESS_RE = /^\W*dc\b|d\/c|dia chi|sdt|\btel\b|hotline|phone|\bmst\b|ma so|website|www\./
/** Tiêu đề và chân trang của bill. */
const HEADER_RE = /tom tat don|chi tiet don hang|hoa don|phieu|receipt|ten mon|ten hang|don gia|thanh tien|^sl\b|\bban\b|table|cam on|hen gap|thank|nhan vien|thu ngan|gio vao|gio ra|gio in|\bin:|\bstt\b|description|quantity|unit price|\bamount\b|bill of sale|ky hieu|serial|so\s*\(no|\(\d\s*=\s*\d\s*x\s*\d\)/
/** Dòng đánh số cột của bảng hoá đơn điện tử: "(1) (2) (3) (4) (5) (6=4x5)" (OCR hay đọc hỏng ngoặc: "a) 2) t3)"). */
const COLUMN_INDEX_RE = /6\s*=\s*4\s*x\s*5|^(?:\W{0,2}\w{1,2}\)\s*){3,}/
const FOOTER_RE = /^\W*t[oe0]ng\b|\bsub ?total\b|\bgrand\b|tong|tam tinh|tien mat|tien thua|tien thoi|thanh toan|tien hang|\bthe\b|card|cash|change/

/** Dòng chữ ký, mã tra cứu, đơn vị cung cấp giải pháp ở chân hoá đơn điện tử. */
const NOTE_RE = /chu ky|signature|ky boi|ky ngay|tra cuu|ma cua co quan|co quan thue|nguoi mua hang|nguoi ban hang|cung cap giai phap|ma qhns|hinh thuc thanh toan|so tai khoan|ngan hang/
/** Khoản giảm ghi dạng "Đã giảm 12.374,00 tương ứng 20% mức tỷ lệ % để tính thuế GTGT..." (giảm thuế theo nghị quyết): là giảm giá bằng số tiền, không phải VAT. */
const REDUCTION_RE = /^\W*da giam\b|\bgiam\s+\d[\d.,]*\s+tuong ung/
/** Dòng tổng của hoá đơn điện tử: "Cộng tiền hàng hoá, dịch vụ (Total amount) 2.050.000" là số phải trả, đã trừ khoản giảm bên dưới. */
const TOTAL_AMOUNT_RE = /total amount/
const UNIT_COLUMN_RE = /don vi tinh|\(unit\)|\bdvt\b/
/** Đơn vị tính hay gặp (đã bỏ dấu, kể cả dạng OCR đọc hỏng) ở cột "Đơn vị tính" của hoá đơn điện tử. */
const UNIT_WORDS = new Set(['lau', 'dia', 'di', 'die', 'tho', 'chai', 'ly', 'phan', 'to', 'cai', 'kg', 'bat', 'suat', 'lon', 'hop', 'goi', 'chiec', 'con', 'lit', 'thung', 'ket', 'cay', 'mieng', 'cuon', 'cu', 'qua'])
/** Dòng "Đơn vị bán hàng (Company): TÊN" của hoá đơn điện tử: tên quán chính là phần sau dấu hai chấm. */
const SELLER_RE = /(?:don vi ban hang|ten don vi ban|nguoi ban)\b(.*)$/

/** Nhãn đứng trước số dài không phải tiền: "Số" (số hoá đơn), "Số tài khoản", "STK" (OCR hay đọc thành "SO"). */
const LONG_NUMBER_LABEL_RE = /^\W*(?:so|stk|so tai khoan|so hoa don|ma so)\s*[:.]?\s*\d/
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
    // Đơn vị tiền dính sau số: 25.000đ, 25,000₫, 25.000 VND.
    .replace(/(\d)\s*(?:đ|₫|vnđ|vnd)(?![\p{L}\d])/giu, '$1')
    // Dấu chấm/phẩy thừa sau số ("90.000.", "1."): vết mực hoặc đường kẻ bị đọc thành dấu câu, làm token không còn là số.
    .replace(/(\d)[.,](?=\s|$)/g, '$1')
    .replace(/(?<=\d)[Oo]|[Oo](?=\d)/g, '0')
    .replace(/(^|\s)[lI|](?=\d)/g, (_match, space: string) => `${space}1`)
    // Đường kẻ bảng bị OCR đọc thành ký tự viền và chuỗi gạch / chấm: thay bằng khoảng trắng trước khi tách số (02 §3 bước 0).
    .replace(/[|¦[\]{}_]/g, ' ')
    .replace(/[-=~—.]{3,}/g, ' ')
    // Chữ "đ" bị đọc thành chữ số: số tiền có nhóm nghìn cuối 4 chữ số ("176.0004") thì bỏ chữ số thừa.
    .replace(/(?<![\d.,])(\d{1,3}(?:[.,]\d{3})*[.,]\d{3})\d(?![\d.,])/g, '$1')
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
/** "12.374,00" (hoá đơn điện tử ghi đồng kèm phần thập phân 00): bỏ phần thập phân để đọc ra 12.374. */
function dropZeroDecimals(line: string): string {
  return line.replace(/(\d{1,3}(?:[.,]\d{3})+)[.,]?00(?!\d)/g, '$1').replace(/(\d)[.,]00(?!\d)/g, '$1')
}

/**
 * Số dài hơn 8 chữ số mà không chia hết cho 100 không phải tiền: mã số thuế, số hoá đơn, số tài khoản (02 §3 bước 5).
 * Số dài chia hết cho 100 vẫn coi là tiền.
 */
function isLongNonMoney(token: string): boolean {
  const digits = token.replace(/\D/g, '')
  if (digits.length <= 8) return false
  const value = parseMoney(token)
  return value === null || value % 100 !== 0
}

function moneyValues(line: string): number[] {
  const withoutPercent = dropZeroDecimals(line.replace(PERCENT_RE, ' '))
  const tokens = withoutPercent.match(MONEY_TOKEN_RE) ?? []
  return tokens
    .filter((token) => !isLongNonMoney(token))
    .map((t) => parseMoney(t))
    .filter((v): v is number => v !== null && v >= 100)
}

/** Dòng có số dài không phải tiền (MST, số hoá đơn, số tài khoản) và không có số tiền nào: không phải món. */
function isLongNumberLine(line: string): boolean {
  const hasLong = line.split(/\s+/).some((token) => /\d{9,}/.test(token) && isLongNonMoney(token))
  return hasLong && moneyValues(line).length === 0
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
  return (hit(VAT_RE, line) && !hit(TAX_ID_RE, line)) || hit(SERVICE_RE, line) || hit(DISCOUNT_RE, line) || hit(EXTRA_FEE_RE, line)
}

/** Dòng có ngày (dd/mm/yyyy hoặc "Ngày d tháng m năm yyyy") không phải món. */
function isDateLine(line: string): boolean {
  return /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(line) || /ngay\s*(?:\([^)]*\)\s*)?[\w|\s]{1,5}?\s*thang/.test(fold(line))
}

function isTotalLine(line: string): boolean {
  return hit(TOTAL_RE, line) && !hit(TOTAL_EXCLUDE_RE, line)
}

/** Chữ số bị OCR đọc thành chữ giống số: "Í 3" → 13, "|0" → 10. */
function digitsOf(raw: string): string {
  return fold(raw).replace(/[il|]/g, '1').replace(/o/g, '0').replace(/[^\d]/g, '')
}

/**
 * "Ngày (date) 13 tháng (month) 10 năm (year) 2026" của hoá đơn điện tử song ngữ: chữ chú thích trong ngoặc chen giữa
 * và ngày/tháng hay bị đọc lẫn ("Í 3"). Trả về mảng kiểu kết quả `exec` (ngày, tháng, năm ở các nhóm 1-3).
 */
function wordsDate(line: string): RegExpExecArray | null {
  const match = /ngay\s*(?:\([^)]*\)\s*)?([\w|\s]{1,5}?)\s*thang\s*(?:\([^)]*\)\s*)?([\w|\s]{1,5}?)\s*nam\s*(?:\([^)]*\)\s*)?\D{0,12}?(\d{4})/.exec(fold(line))
  if (!match) return null
  const day = digitsOf(match[1])
  const month = digitsOf(match[2])
  if (day === '' || month === '') return null
  return Object.assign([match[0], day, month, match[3]], { index: match.index, input: match.input }) as RegExpExecArray
}

function findDate(lines: string[]): string | undefined {
  for (const line of lines) {
    const dmy = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/.exec(line)
    const words = /ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/.exec(fold(line)) ?? wordsDate(line)
    const match = words ?? dmy
    if (!match) continue
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]
    const ymd = `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    if (isValidYmd(ymd) && isYmdInRange(ymd)) return ymd
  }
  return undefined
}

/** Tên quán: trong 4 dòng đầu không phải địa chỉ/tiêu đề, ưu tiên dòng có từ khoá và viết hoa. */
function findSeller(lines: string[]): string | undefined {
  for (const line of lines) {
    if (!SELLER_RE.test(fold(line))) continue
    // Tên nằm sau dấu hai chấm hoặc ngoặc đóng của nhãn song ngữ "(Company):"; nhãn bị OCR làm hỏng dấu thì lấy cụm chữ hoa ở cuối dòng.
    const afterLabel = /[:)]\s*([^:)]+)$/.exec(line)?.[1] ?? /((?:[A-ZÀ-Ỹ]{2,}\s+){1,}[A-ZÀ-Ỹ]{2,})\s*$/.exec(line)?.[1]
    const name = afterLabel?.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N})]+$/u, '').trim()
    if (name && (name.match(/\p{L}/gu) ?? []).length >= 3) return name
  }
  return undefined
}

function findVendor(lines: string[]): string | undefined {
  const seller = findSeller(lines)
  if (seller) return seller
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
  // Số thứ tự (STT) đầu dòng của bảng: "1 | Canh chua", "5 |Cơm", "_3._ Cải", "2. Bia".
  let name = raw.replace(/^[^\p{L}\p{N}]*\d{1,2}\s*(?:[.)]+[_\s]+|\|+\s*)/u, '').trim()
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
/** Tên món không nên chứa số tiền: từ 3.000 đồng trở lên thì khả năng cao là số tiền bị hiểu nhầm (số nhỏ hơn như "1964" là tên món). */
const BIG_NUMBER_MIN = 3000
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

/** Bỏ từ đơn vị tính ở cuối tên (chỉ khi còn lại ít nhất một từ). */
function dropTrailingUnit(name: string): string {
  const tokens = name.split(' ')
  if (tokens.length < 2 || !UNIT_WORDS.has(fold(tokens[tokens.length - 1]))) return name
  return tokens.slice(0, -1).join(' ')
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
function parseItems(lines: string[], vendorName: string | undefined, origins?: Map<ParsedItem, number>): ParsedItem[] {
  const items: ParsedItem[] = []
  // Bảng có cột "Đơn vị tính": từ đơn vị (Lẩu, Dĩa, Thố…) đứng cuối tên món, không thuộc tên.
  const unitColumn = lines.some((l) => hit(UNIT_COLUMN_RE, l))
  /** Các dòng chỉ có chữ liên tiếp chưa gắn vào món nào. */
  let pending: string[] = []
  /** Dòng đang đọc, ghi lại làm vị trí của món để gắn món vào nhóm Drink / Food. */
  let current = 0

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
    origins?.set(item, current)
  }

  // Hoá đơn điện tử dạng bảng: các món nằm trước dòng "Cộng tiền hàng hóa… (Total amount)"; phần sau là chữ ký số, mã tra cứu…
  const tableMode = unitColumn || lines.some((l) => hit(TOTAL_AMOUNT_RE, l))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    current = i
    if (tableMode && items.length > 0 && (hit(TOTAL_AMOUNT_RE, line) || hit(/^\W*cong tien/, line))) break
    const isClassified =
      isAdjustmentLine(line) || isTotalLine(line) || isDateLine(line) || hit(ADDRESS_RE, line) || hit(HEADER_RE, line) || hit(FOOTER_RE, line) || hit(COLUMN_INDEX_RE, line) || hit(NOTE_RE, line) || hit(ITEM_NOTE_RE, line) || isLongNumberLine(line) || hit(LONG_NUMBER_LABEL_RE, line)
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
    const leading = LEADING_QTY_RE.exec(line)
    const tail = splitTail(leading ? line.slice(leading[0].length) : line)
    const tailItem = tail ? interpretTail(tail.numbers) : null
    if (tail && tailItem) {
      const name = [tail.name, ...tailItem.extra].join(' ')
      let { quantity, unitPrice, uncertain } = tailItem
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

    if (isNameOnly(line) && line !== vendorName) pending.push(line)
  }
  return items
}

// ---------------------------------------------------------------------------
// Bảng hàng hoá của hoá đơn GTGT (Grab, khách sạn, nhà hàng xuất hoá đơn đỏ)
// ---------------------------------------------------------------------------

const TABLE_HEAD_RE = /\bstt\b/
const TABLE_HEAD_NAME_RE = /ten hang|ten dich vu|description|dien giai|noi dung/
/** Dòng kết thúc bảng: tổng cộng, thuế, số tiền bằng chữ, chữ ký. */
const TABLE_END_RE = /^\W*(?:tong\b|cong tien|so tien viet bang chu|thue suat|nguoi mua|nguoi ban)|\btotal\b|amount in words/
/** Tên dòng là khoản giảm trừ: chiết khấu, giảm giá, khuyến mại. */
const TABLE_DISCOUNT_RE = /chiet khau|giam gia|khuyen mai|discount|\bgiam\b/
/** Mã chuyến / mã đơn đứng riêng một dòng (xuống dòng của tên hàng): "9TCF6T2GW6FDAV". */
const CODE_LINE_RE = /^[A-Z0-9][A-Z0-9-]{7,}$/
const STT_ROW_RE = /^[|_\s]*(\d{1,3})(?:\s*[|.)]+\s*|\s+)(.*)$/u
const MIN_TABLE_AMOUNT = 100
/** Cột thuế suất ghi chữ thay vì số: "KCT", "KKKNT". */
const TAX_WORD_TOKEN_RE = /^(?:kct|kkknt|ko|\d+%)$/i

interface TableRow {
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
function findTriple(values: number[]): { iq: number; iu: number; ia: number } | null {
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

function parseTableRow(rest: string): TableRow | null {
  let text = dropZeroDecimals(rest)
  const negative = /(?:^|\s)[-–−]\s?\d[\d.,]*(?:\s*[₫đ])?\s*$/.test(text) || /\(\s*\d[\d.,]*\s*\)\s*$/.test(text)
  text = text.replace(PERCENT_RE, ' ').replace(/(^|\s)[-–−]\s?(?=\d)/g, '$1').replace(/[()]/g, ' ').replace(/(?<=\d)[₫đ]|(?<=\s)[₫đ](?=\s|$)/g, ' ')
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
  return { quantity: tail.quantity, unitPrice: tail.unitPrice, amount: tail.amount, inclusive: false, uncertain: true, text: [...head, ...tail.extra].join(' '), negative }
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
function tableItemName(raw: string): string | undefined {
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
    if (stt && !/\p{L}/u.test(stt[2]) && pending.length === 0 && (!row || row.amount < 1000)) row = null
    const isRowNumber = stt !== null && sttNumber > expected && sttNumber <= expected + 3 && (row !== null || /\p{L}/u.test(stt[2]) || pending.length > 0)

    if (!isRowNumber) {
      // Dòng không có STT: tên xuống dòng (trước dòng số), mã chuyến (sau dòng số), hoặc rác.
      if (hit(HEADER_RE, line) || hit(NOTE_RE, line) || hit(ADDRESS_RE, line) || hit(COLUMN_INDEX_RE, line)) pending = []
      else if (CODE_LINE_RE.test(line) && /\d/.test(line)) consumed.add(i)
      // Dòng có ngoặc đóng thừa ("VAT)") là phần cuối của tiêu đề cột bị xuống dòng, không phải tên hàng.
      else if (isNameOnly(line) && !line.startsWith('(') && !/:\s*\S/.test(line) && (line.match(/\)/g) ?? []).length <= (line.match(/\(/g) ?? []).length) pending.push({ index: i, text: line })
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
    const prefix = pending.slice(-2).map((p) => p.text).join(' ')
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

const PRETAX_RE = /truoc thue|chua thue|chua co thue|chua gom thue|exc\.? ?vat|excl|before tax/
/** Dòng tổng đã gồm thuế: "Tổng cộng số tiền đã có thuế GTGT", "Tổng thanh toán (đã gồm VAT)". */
const TAX_INCLUDED_TOTAL_RE = /(?:da|gom|bao gom|co) (?:co |gom )?(?:thue|vat|gtgt)|vat included|tax included|incl\.? ?vat/
/** Dòng chỉ có số tiền (nhãn song ngữ xuống dòng: "Tổng cộng ...:" rồi "60.000" ở dòng sau). */
const MONEY_ONLY_RE = /^\d[\d.,]*\s*(?:[₫đ]|vnd)?$/i

/** Số tiền của dòng; nhãn không có số thì lấy dòng ngay sau nếu dòng đó chỉ có số tiền. */
function totalValue(lines: string[], index: number): number | undefined {
  const values = moneyValues(lines[index])
  if (values.length > 0) return values[values.length - 1]
  const next = lines[index + 1]
  if (next !== undefined && MONEY_ONLY_RE.test(next)) return moneyValues(next)[0]
  return undefined
}

/** Dòng tổng của nhóm đồ uống / đồ ăn khi bill tính riêng hai nhóm: "Tổng giá đồ uống 120.000", "Đồ ăn: 300.000". */
const DRINK_GROUP_RE = /^(?:drinks?|beverages?|do uong|nuoc uong|thuc uong)$/
const FOOD_GROUP_RE = /^(?:foods?|do an|mon an|thuc an)$/
/** Từ đệm trước/sau tên nhóm: "Tổng giá đồ uống", "Total food", "Food total", "Subtotal drinks". */
const GROUP_FILLER_RE = /\b(?:tong|total|subtotal|sub|gia|tien|cong|sum|cac|all|of)\b/g

/** Nhãn nhóm của một dòng: bỏ số tiền và từ đệm, phần còn lại phải đúng là tên nhóm (món "Soft drink 2 x 20.000" không tính). */
function groupKind(line: string): 'drink' | 'food' | null {
  if (line.includes('=')) return null
  const label = fold(line).replace(/[\d.,]+k?/g, ' ').replace(GROUP_FILLER_RE, ' ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
  return DRINK_GROUP_RE.test(label) ? 'drink' : FOOD_GROUP_RE.test(label) ? 'food' : null
}

/**
 * Bill tính riêng đồ uống và đồ ăn: mỗi nhóm một dòng tổng (có số tiền). Hai dòng này được giữ làm hai "món" dù không phải món ăn.
 * Trả về các dòng nhóm (đồ uống trước) và vị trí của chúng trong `lines`; dòng không có số tiền (tiêu đề nhóm) bị bỏ qua.
 */
function findGroupRows(lines: string[]): { rows: ParsedItem[]; indexes: Set<number>; lines: GroupLine[] } {
  const found = new Map<'drink' | 'food', { name: string; amount: number; index: number }>()
  const indexes = new Set<number>()
  lines.forEach((line, i) => {
    const kind = groupKind(line)
    if (!kind || hit(ADDRESS_RE, line) || isDateLine(line)) return
    const values = moneyValues(line)
    if (values.length === 0) return
    indexes.add(i)
    if (!found.has(kind)) found.set(kind, { name: kind === 'drink' ? t('Tổng đồ uống') : t('Tổng đồ ăn'), amount: values[values.length - 1], index: i })
  })
  const rows = (['drink', 'food'] as const).flatMap((k) => {
    const g = found.get(k)
    return g ? [{ name: g.name, quantity: 1, unitPrice: g.amount, rawAmount: g.amount, uncertain: false }] : []
  })
  const groupLines = (['drink', 'food'] as const).flatMap((k) => {
    const g = found.get(k)
    return g ? [{ kind: k, amount: g.amount, index: g.index }] : []
  })
  return { rows, indexes, lines: groupLines }
}

interface GroupLine {
  kind: 'drink' | 'food'
  amount: number
  index: number
}

const MISSING_ITEM_NAME = 'Món chưa đọc được'

/**
 * Các món so với dòng tổng nhóm (Drink / Food) của bill (02 §3 bước 5, BR-4.20). Dòng nhóm là subtotal chứ không thay món:
 * mỗi dòng nhóm khép các món nằm ngay trên nó; nhóm thiếu thì thêm "Món chưa đọc được" đúng phần thiếu, nhóm thừa thì giữ
 * nguyên và báo lệch. Không biết vị trí món (bảng hàng hoá) thì đối soát chung cả bill.
 */
function reconcileGroups(items: ParsedItem[], origins: Map<ParsedItem, number> | undefined, groupLines: GroupLine[]): { items: ParsedItem[]; checks: NonNullable<ParsedReceipt['groupChecks']> } {
  const sum = (list: ParsedItem[]): number => list.reduce((s, i) => s + i.rawAmount, 0)
  const missingItem = (amount: number): ParsedItem => ({ name: t(MISSING_ITEM_NAME), quantity: 1, unitPrice: amount, rawAmount: amount, uncertain: true })
  const sorted = [...groupLines].sort((a, b) => a.index - b.index)
  const groupSum = sorted.reduce((s, g) => s + g.amount, 0)
  if (sum(items) === groupSum) return { items, checks: [] }

  if (!origins || items.some((item) => !origins.has(item))) {
    const read = sum(items)
    return { items: read < groupSum ? [...items, missingItem(groupSum - read)] : items, checks: [{ expected: groupSum, read }] }
  }

  const segments: ParsedItem[][] = sorted.map(() => [])
  const rest: ParsedItem[] = []
  for (const item of items) {
    const k = sorted.findIndex((g) => g.index > (origins.get(item) as number))
    ;(k < 0 ? rest : segments[k]).push(item)
  }
  const checks: NonNullable<ParsedReceipt['groupChecks']> = []
  const out: ParsedItem[] = []
  sorted.forEach((group, k) => {
    const read = sum(segments[k])
    out.push(...segments[k])
    if (read === group.amount) return
    checks.push({ group: group.kind, expected: group.amount, read })
    if (read < group.amount) out.push(missingItem(group.amount - read))
  })
  return { items: [...out, ...rest], checks }
}

/** Tên món (02 §3 bước 11): số ở cuối tên tối đa 4 chữ số ("Bia 1964"); số dài hơn 4 chữ số là mã hoặc số tiền bị đọc nhầm, bỏ hết. */
function tidyItemName(item: ParsedItem): ParsedItem {
  const name = item.name.replace(/(\s+\d+)+$/, (tail) => (/\d{5}/.test(tail) ? '' : tail)).trim()
  return name === item.name ? item : { ...item, name }
}

/**
 * Tổng bill khi các dòng tổng đọc lệch nhau (02 §3 bước 10): lấy số xuất hiện nhiều nhất trong các dòng tổng và tiền hàng,
 * nếu có số lặp lại ít nhất hai lần. Không có số nào lặp lại thì trả `undefined` (validation thử biến thể 1 ↔ 4).
 */
function majorityTotal(lines: string[]): number | undefined {
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

/** Phân tích văn bản OCR của một hoá đơn. Không ném lỗi: thứ không đọc được thì bỏ trống. */
export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line.length > 0)

  const vendorName = findVendor(lines)
  const table = parseVatTable(lines)
  const useTable = table !== null && (table.items.length > 0 || table.rows.unread.length > 0)
  const origins = new Map<ParsedItem, number>()
  const result: ParsedReceipt = { items: useTable ? table.items : parseItems(lines, vendorName, origins) }
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
    if (hit(REDUCTION_RE, line)) {
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

  const majority = majorityTotal(lines)
  if (majority !== undefined) result.billTotal = majority

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
