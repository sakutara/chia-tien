// Ngày, tên quán và các dòng đầu của bill.
import { ADDRESS_RE, HEADER_RE, SELLER_RE, VENDOR_KEYWORD_RE, hit } from './patterns'
import { fold } from '../../lib/textFold'
import { isValidYmd } from '../../lib/dates'
import { isYmdInRange } from '../../lib/dates'

/** Dòng có ngày (dd/mm/yyyy hoặc "Ngày d tháng m năm yyyy") không phải món. */
export function isDateLine(line: string): boolean {
  return /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(line) || /ngay\s*(?:\([^)]*\)\s*)?[\w|\s]{1,5}?\s*thang/.test(fold(line))
}

/** Chữ số bị OCR đọc thành chữ giống số: "Í 3" → 13, "|0" → 10. */
export function digitsOf(raw: string): string {
  return fold(raw).replace(/[il|]/g, '1').replace(/o/g, '0').replace(/[^\d]/g, '')
}

/**
 * "Ngày (date) 13 tháng (month) 10 năm (year) 2026" của hoá đơn điện tử song ngữ: chữ chú thích trong ngoặc chen giữa
 * và ngày/tháng hay bị đọc lẫn ("Í 3"). Trả về mảng kiểu kết quả `exec` (ngày, tháng, năm ở các nhóm 1-3).
 */
export function wordsDate(line: string): RegExpExecArray | null {
  const match = /ngay\s*(?:\([^)]*\)\s*)?([\w|\s]{1,5}?)\s*thang\s*(?:\([^)]*\)\s*)?([\w|\s]{1,5}?)\s*nam\s*(?:\([^)]*\)\s*)?\D{0,12}?(\d{4})/.exec(fold(line))
  if (!match) return null
  const day = digitsOf(match[1])
  const month = digitsOf(match[2])
  if (day === '' || month === '') return null
  return Object.assign([match[0], day, month, match[3]], { index: match.index, input: match.input }) as RegExpExecArray
}

export function findDate(lines: string[]): string | undefined {
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
export function findSeller(lines: string[]): string | undefined {
  for (const line of lines) {
    if (!SELLER_RE.test(fold(line))) continue
    // Tên nằm sau dấu hai chấm hoặc ngoặc đóng của nhãn song ngữ "(Company):"; nhãn bị OCR làm hỏng dấu thì lấy cụm chữ hoa ở cuối dòng.
    const afterLabel = /[:)]\s*([^:)]+)$/.exec(line)?.[1] ?? /((?:[A-ZÀ-Ỹ]{2,}\s+){1,}[A-ZÀ-Ỹ]{2,})\s*$/.exec(line)?.[1]
    const name = afterLabel
      ?.replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/[^\p{L}\p{N})]+$/u, '')
      .trim()
    if (name && (name.match(/\p{L}/gu) ?? []).length >= 3) return name
  }
  return undefined
}

/** Dòng siêu dữ liệu có nhãn và mã/số: "Số HĐ: 300174", "Số order: 1.11", "Mã HĐ: …". Không phải tên quán. */
export const VENDOR_METADATA_RE = /^\W*(?:so hd|so hoa don|ma hd|so bill|so order|so phieu|ngay|gio)\s*:\s*\S*\d/

/** Dòng rác OCR từ logo: quá nửa số token là một chữ cái hoặc một số ("E R MAT s 38 E"). Một token không tính là rác. */
export function isNoiseLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/)
  if (tokens.length < 2) return false
  const noise = tokens.filter((t) => /^\p{L}$/u.test(t) || /^\d+$/.test(t)).length
  return noise * 2 >= tokens.length
}

export function findVendor(lines: string[]): string | undefined {
  const seller = findSeller(lines)
  if (seller) return seller
  let best: { name: string; score: number } | undefined
  for (const line of lines.slice(0, 4)) {
    if (hit(ADDRESS_RE, line) || hit(HEADER_RE, line) || !/[A-Za-zÀ-ỹ]/.test(line)) continue
    if (hit(VENDOR_METADATA_RE, line) || isNoiseLine(line)) continue
    if (/\d{1,2}[/.-]\d{1,2}[/.-]\d/.test(line)) continue
    let score = 0
    if (hit(VENDOR_KEYWORD_RE, line)) score += 2
    const letters = line.replace(/[^A-Za-zÀ-ỹ]/g, '')
    // Chữ hoa theo đúng hoa/thường: dải "À-Ỹ" còn chứa cả chữ thường có dấu như "à", nên không dùng regex dải đó.
    const upper = [...letters].filter((c) => c !== c.toLowerCase())
    if (letters.length > 0 && upper.length / letters.length >= 0.7) score += 1
    if (score > 0 && (!best || score > best.score)) {
      best = { name: line.replace(/[:-]+$/, '').trim(), score }
    }
  }
  return best?.name
}
