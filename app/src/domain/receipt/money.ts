// Đọc số tiền từ token OCR.
import { CODE_LINE_RE, MONEY_TOKEN_RE, PERCENT_RE, PHONE_RUN_RE, hit } from './patterns'
import { parseMoney } from '../../lib/money'

/** Các số tiền (≥ 100 đồng) trên dòng, sau khi bỏ phần trăm. */
/** "12.374,00" (hoá đơn điện tử ghi đồng kèm phần thập phân 00): bỏ phần thập phân để đọc ra 12.374. */
export function dropZeroDecimals(line: string): string {
  return line.replace(/(\d{1,3}(?:[.,]\d{3})+)[.,]?00(?!\d)/g, '$1').replace(/(\d)[.,]00(?!\d)/g, '$1')
}

/**
 * Số dài hơn 8 chữ số mà không chia hết cho 100 không phải tiền: mã số thuế, số hoá đơn, số tài khoản (02 §3 bước 5).
 * Số dài chia hết cho 100 vẫn coi là tiền.
 */
export function isLongNonMoney(token: string): boolean {
  const digits = token.replace(/\D/g, '')
  if (digits.length <= 8) return false
  const value = parseMoney(token)
  return value === null || value % 100 !== 0
}

/** Dòng mã (quầy, NVBH, số điện thoại): các số trong dòng không phải số tiền (spec receipt-ocr). */
export function isCodeLine(line: string): boolean {
  return hit(CODE_LINE_RE, line) || PHONE_RUN_RE.test(line)
}

export function moneyValues(line: string): number[] {
  if (isCodeLine(line)) return []
  // Nhóm nghìn bị OCR tách bởi khoảng trắng ("Tổng cộng 1 562 000") được gộp lại trước khi tách số.
  const withoutPercent = mergeThousandGroups(dropZeroDecimals(line.replace(PERCENT_RE, ' ')).split(' ')).join(' ')
  const tokens = withoutPercent.match(MONEY_TOKEN_RE) ?? []
  return tokens
    .filter((token) => !isLongNonMoney(token))
    .map((t) => parseMoney(t))
    .filter((v): v is number => v !== null && v >= 100)
}

/** Dòng có số dài không phải tiền (MST, số hoá đơn, số tài khoản) và không có số tiền nào: không phải món. */
export function isLongNumberLine(line: string): boolean {
  const hasLong = line.split(/\s+/).some((token) => /\d{9,}/.test(token) && isLongNonMoney(token))
  return hasLong && moneyValues(line).length === 0
}

/**
 * Gộp nhóm nghìn bị OCR tách bởi khoảng trắng: "49 000" → "49,000", "1 250 000" → "1,250,000".
 * Số đã tròn nghìn ("139,000") chỉ nhận thêm nhóm "000" ("12 500 000"): nhóm khác là số tiền kế tiếp của dòng,
 * nếu không "139 000 139 000" (đơn giá và thành tiền) thành một số.
 */
export function mergeThousandGroups(tokens: string[]): string[] {
  const out: string[] = []
  for (const token of tokens) {
    const last = out[out.length - 1]
    const open = last !== undefined && /^\d{1,3}(,\d{3})*$/.test(last) && (!last.endsWith(',000') || token === '000')
    if (open && /^\d{3}$/.test(token)) out[out.length - 1] = `${last},${token}`
    else out.push(token)
  }
  return out
}
