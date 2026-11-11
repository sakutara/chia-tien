/*
 * Gom các từ OCR thành dòng theo toạ độ dọc (architecture VietOCR §2.2): từ cùng hàng ngang ghép thành một dòng,
 * và khoảng cách ngang lớn (nhảy sang cột SL / Đơn giá / Thành tiền) được tách bằng hai khoảng trắng để `receiptParser` nhận ra cột.
 * Hàm thuần, không phụ thuộc runtime OCR.
 */

/** Một từ OCR kèm hộp bao (toạ độ pixel của ảnh đã quét). */
export interface OcrWord {
  text: string
  x0: number
  y0: number
  x1: number
  y1: number
}

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
  return lines.map(orderLine)
}

/** Hai từ chồng lên nhau theo chiều ngang quá tỉ lệ này của từ hẹp hơn thì coi là cùng một ô (xếp chồng theo chiều dọc). */
const STACKED_OVERLAP_RATIO = 0.5

/**
 * Sắp một dòng từ trái sang phải. Tên món xuống dòng trong ô của bảng ("Cà Phê (Nitro" / "Coldbrew)") nằm trên và dưới
 * hàng số nên rơi vào cùng một dòng: các mảnh chồng nhau theo chiều ngang được đọc từ trên xuống thay vì theo mép trái.
 */
function orderLine(line: OcrWord[]): OcrWord[] {
  const sorted = [...line].sort((a, b) => a.x0 - b.x0)
  const cells: OcrWord[][] = []
  for (const word of sorted) {
    const cell = cells[cells.length - 1]
    const x1 = cell ? Math.max(...cell.map((w) => w.x1)) : -Infinity
    const narrow = cell ? Math.min(word.x1 - word.x0, ...cell.map((w) => w.x1 - w.x0)) : 0
    if (cell && x1 - word.x0 > STACKED_OVERLAP_RATIO * narrow) cell.push(word)
    else cells.push([word])
  }
  return cells.flatMap((cell) => cell.sort((a, b) => centerY(a) - centerY(b)))
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
        // Mảnh xếp chồng trong cùng một ô có khoảng cách âm: nối bằng một khoảng trắng.
        const gap = word.x0 - line[i - 1].x1
        const separator = gap > COLUMN_GAP_RATIO * lineHeight ? COLUMN_SEPARATOR : ' '
        return `${text}${separator}${word.text.trim()}`
      }, ''),
    )
    .join('\n')
}
