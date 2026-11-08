/*
 * Gom các từ OCR thành dòng theo toạ độ dọc (architecture VietOCR §2.2): từ cùng hàng ngang ghép thành một dòng,
 * và khoảng cách ngang lớn (nhảy sang cột SL / Đơn giá / Thành tiền) được tách bằng hai khoảng trắng để `receiptParser` nhận ra cột.
 * Hàm thuần, không phụ thuộc Tesseract hay ONNX.
 */
import type { OcrWord } from './ocrDigits'

/** Hai từ cùng hàng khi lệch tâm dọc không quá tỉ lệ này nhân chiều cao chữ trung vị. */
const SAME_LINE_RATIO = 0.55
/** Khoảng trắng ngang lớn hơn tỉ lệ này nhân chiều cao chữ trung vị được coi là ranh giới cột. */
const COLUMN_GAP_RATIO = 1.5
/** Dấu phân cột giữa hai ô của một dòng. */
const COLUMN_SEPARATOR = '  '

const centerY = (w: OcrWord) => (w.y0 + w.y1) / 2

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Nhóm từ thành các dòng ngang, mỗi dòng sắp từ trái sang phải. Dòng trên xuống dưới. */
export function groupWordsIntoLines(words: OcrWord[]): OcrWord[][] {
  const usable = words.filter((w) => w.text.trim() !== '')
  if (usable.length === 0) return []
  const lineHeight = median(usable.map((w) => w.y1 - w.y0))
  const byHeight = [...usable].sort((a, b) => centerY(a) - centerY(b))

  const lines: OcrWord[][] = []
  let sumY = 0
  for (const word of byHeight) {
    const current = lines[lines.length - 1]
    if (current && Math.abs(centerY(word) - sumY / current.length) <= SAME_LINE_RATIO * lineHeight) {
      current.push(word)
      sumY += centerY(word)
    } else {
      lines.push([word])
      sumY = centerY(word)
    }
  }
  return lines.map((line) => line.sort((a, b) => a.x0 - b.x0))
}

/**
 * Ghép từ OCR thành văn bản nhiều dòng (phân tách bằng `\n`) để đưa vào `parseReceipt`.
 * Khoảng trắng ngang lớn giữa hai từ liền kề được thay bằng dấu phân cột.
 */
export function layoutOcrText(words: OcrWord[]): string {
  const usable = words.filter((w) => w.text.trim() !== '')
  if (usable.length === 0) return ''
  const lineHeight = median(usable.map((w) => w.y1 - w.y0))

  return groupWordsIntoLines(usable)
    .map((line) =>
      line.reduce((text, word, i) => {
        if (i === 0) return word.text.trim()
        const gap = word.x0 - line[i - 1].x1
        const separator = gap > COLUMN_GAP_RATIO * lineHeight ? COLUMN_SEPARATOR : ' '
        return `${text}${separator}${word.text.trim()}`
      }, ''),
    )
    .join('\n')
}
