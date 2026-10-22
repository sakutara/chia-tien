/*
 * Lượt 2 của OCR (02 §3 bước 2): chọn các từ số tiền để đọc lại bằng bộ đọc chỉ-chữ-số, và ghép lại văn bản.
 * Hàm thuần, không đụng canvas hay Tesseract; tầng dịch vụ (`services/ocrService.ts`) làm phần cắt ảnh và nhận dạng.
 */

/** Từ OCR với hộp bao (toạ độ pixel của ảnh đầu vào Tesseract). */
export interface OcrWord {
  text: string
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Từ như Tesseract trả về: toạ độ nằm trong `bbox`. */
interface TesseractWord {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

/** Cấu trúc Tesseract trả về (chỉ phần dùng tới): khối → đoạn → dòng → từ. */
export interface OcrBlockLike {
  paragraphs?: Array<{ lines?: Array<{ words?: TesseractWord[] }> }>
}

/** Số đọc lại tối đa mỗi ảnh (ưu tiên các dòng cuối bill: tổng, VAT, giảm giá). */
export const MAX_REREAD_WORDS = 40
const PAD = 20

/** Các dòng chữ của một ảnh, theo thứ tự đọc. Bỏ dòng rỗng. */
export function collectLines(blocks: OcrBlockLike[] | null | undefined): OcrWord[][] {
  const out: OcrWord[][] = []
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const words: OcrWord[] = (line.words ?? [])
          .filter((w) => w.text.trim() !== '')
          .map((w) => ({ text: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 }))
        if (words.length > 0) out.push(words)
      }
    }
  }
  return out
}

/** Từ có dạng số tiền: bắt đầu bằng chữ số, có ít nhất 3 chữ số, và không phải số dài lẻ (MST, số hoá đơn). */
export function isMoneyWord(text: string): boolean {
  // Có thể còn ký hiệu tiền dính sau số ("476.000đ"); bản đọc lại chỉ có chữ số.
  if (!/^\d[\d.,]*[đ₫d]?$/i.test(text)) return false
  const digits = text.replace(/\D/g, '')
  if (digits.length < 3) return false
  if (digits.length > 8) {
    const value = Number(digits)
    return value % 100 === 0
  }
  return true
}

export interface RereadTarget {
  line: number
  word: number
}

/** Các từ số tiền cần đọc lại, dòng cuối trước, tối đa `limit` từ. */
export function selectRereadTargets(lines: OcrWord[][], limit: number = MAX_REREAD_WORDS): RereadTarget[] {
  const targets: RereadTarget[] = []
  for (let l = lines.length - 1; l >= 0 && targets.length < limit; l--) {
    lines[l].forEach((word, w) => {
      if (targets.length < limit && isMoneyWord(word.text)) targets.push({ line: l, word: w })
    })
  }
  return targets
}

/** Hình chữ nhật cần cắt quanh một từ (viền trắng `PAD` px, không ra ngoài ảnh). */
export function cropRect(word: OcrWord, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const x = Math.max(0, word.x0 - PAD)
  const y = Math.max(0, word.y0 - PAD)
  const x1 = Math.min(width, word.x1 + PAD)
  const y1 = Math.min(height, word.y1 + PAD)
  return { x, y, w: Math.max(1, x1 - x), h: Math.max(1, y1 - y) }
}

/**
 * Chấp nhận kết quả đọc lại khi nó là số tiền hợp lệ (nhóm nghìn hoặc số thuần) và khác bản đọc lần đầu;
 * rỗng hoặc sai dạng thì giữ bản cũ.
 */
export function acceptReread(original: string, candidate: string): string | undefined {
  // Ký hiệu "đ" dính sau số hay được đọc thành một chữ số thừa ("176.0004"): bỏ chữ số đó (02 §3 bước 0).
  const value = candidate.trim().replace(/^(\d{1,3}(?:[.,]\d{3})+)\d$/, '$1')
  if (value === '' || value === original) return undefined
  if (!/^\d{1,3}([.,]\d{3})+$|^\d+$/.test(value)) return undefined
  return value
}

/** Ghép lại văn bản từ các dòng, thay từ theo `replaced` (khoá `line:word`). */
export function buildText(lines: OcrWord[][], replaced: Map<string, string>): string {
  return lines
    .map((words, l) => words.map((w, i) => replaced.get(`${l}:${i}`) ?? w.text).join(' '))
    .join('\n')
}
