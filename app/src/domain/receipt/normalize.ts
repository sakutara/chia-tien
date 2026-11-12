// Chuẩn hoá văn bản OCR từng dòng.

/** Chuẩn hoá một dòng OCR: sửa lỗi O/l thành số ở chỗ dính với chữ số, gọn khoảng trắng. */
export function normalizeLine(raw: string): string {
  return (
    raw
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
      .replace(EQ_JUNK_RE, '$1 x $2 = $3')
      .replace(EQ_FIVE_RE, '$1 x $2 = $3')
      .replace(EQ_MISSING_RE, '$1 x $2 = $3')
      .replace(X_MISSING_RE, '$1 x $2 = $3')
  )
}

/** Số tiền có nhóm nghìn ("5,000", "1.250.000"). */
export const GROUPED = String.raw`\d{1,3}(?:[.,]\d{3})+`
/** Dòng "SL x đơn giá = thành tiền" mà dấu "=" bị OCR đọc thành một ký tự lạ ("1 x 125,000 F 125,000", có thể mất cả "x"). */
export const EQ_JUNK_RE = new RegExp(String.raw`(?<![\d.,])(\d{1,3})(?:\s*[xX×*]\s*|\s+)(${GROUPED})\s+[^\s\d=xX×*]\s+(${GROUPED})$`, 'u')
/** Như trên nhưng "=" bị đọc thành "5": chỉ nhận khi có dấu "x" để không ăn nhầm cột số lượng. */
export const EQ_FIVE_RE = new RegExp(String.raw`(?<![\d.,])(\d{1,3})\s*[xX×*]\s*(${GROUPED})\s+5\s+(${GROUPED})$`)
/** Mất hẳn dấu "=": "1 x 105,000 105,000". */
export const EQ_MISSING_RE = new RegExp(String.raw`(?<![\d.,])(\d{1,3})\s*[xX×*]\s*(${GROUPED})\s+(${GROUPED})$`)
/** Mất dấu "x": "1 105,000 = 105,000". */
export const X_MISSING_RE = new RegExp(String.raw`(?<![\d.,])(\d{1,3})\s+(${GROUPED})\s*=\s*(${GROUPED})$`)

/** Số tiền có nhóm nghìn mà OCR đọc lẫn chữ giống số ("§9,000", "5S,000", "l0.000"): đổi lại thành chữ số. */
export const LOOKALIKE_MONEY_RE = /^[\dOoSs§BlI|]{1,3}[.,][\dOo]{3}$/
export function fixDigitLookalikes(token: string): string {
  if (!LOOKALIKE_MONEY_RE.test(token) || (token.match(/\d/g) ?? []).length < 3) return token
  return token.replace(/[Oo]/g, '0').replace(/[Ss§]/g, '5').replace(/B/g, '8').replace(/[lI|]/g, '1')
}

/** Dòng gạch dài nối giữa các món ("-------", "=====", ". . . . ."): bill quán ăn dùng nó để ngăn cách từng món. */
export function isSeparatorLine(raw: string): boolean {
  const compact = raw.replace(/\s/g, '')
  return compact.length >= 5 && /^[-=~_—–.+:·'‘’`*]+$/.test(compact) && /[-=~_—–]/.test(compact)
}
