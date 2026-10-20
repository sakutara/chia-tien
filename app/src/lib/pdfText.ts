/*
 * Dựng văn bản từ lớp chữ của PDF (hoá đơn điện tử có sẵn chữ nên không cần OCR): các mảnh chữ có toạ độ được gom thành
 * dòng theo trục dọc, trong dòng xếp theo trục ngang, khoảng cách lớn giữa hai mảnh (cột đơn giá / SL / thành tiền) giữ
 * thành nhiều khoảng trắng để bộ phân tích tách được cột. Hàm thuần, không phụ thuộc pdf.js.
 */

export interface PdfTextItem {
  str: string
  /** Mép trái và đường cơ sở của mảnh chữ (toạ độ PDF: y tăng dần lên trên). */
  x: number
  y: number
  width: number
  height: number
}

/** Số ký tự (không tính khoảng trắng) tối thiểu để coi một trang PDF là có lớp chữ. */
export const MIN_TEXT_CHARS = 20

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)]
}

/** Các dòng của trang, từ trên xuống dưới. Rỗng nếu trang không có chữ. */
export function textItemsToLines(items: ReadonlyArray<PdfTextItem>): string[] {
  const pieces = items.filter((it) => it.str.trim().length > 0)
  if (pieces.length === 0) return []

  const lineHeight = median(pieces.map((p) => p.height).filter((h) => h > 0)) || 10
  const tolerance = Math.max(1.5, lineHeight * 0.5)

  // Từ trên xuống: y lớn trước. Mảnh thuộc dòng hiện tại khi lệch đường cơ sở không quá nửa chiều cao chữ.
  const sorted = [...pieces].sort((a, b) => b.y - a.y)
  const rows: PdfTextItem[][] = []
  let rowY = Number.NaN
  for (const piece of sorted) {
    if (rows.length > 0 && Math.abs(piece.y - rowY) <= tolerance) {
      rows[rows.length - 1].push(piece)
    } else {
      rows.push([piece])
      rowY = piece.y
    }
  }

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x)
    let line = ''
    let end = Number.NaN
    for (const piece of row) {
      const text = piece.str.trim()
      if (line !== '') {
        const gap = piece.x - end
        const unit = Math.max(piece.height, 1)
        // Chữ liền nhau (một từ bị PDF cắt thành nhiều mảnh) thì không chèn khoảng trắng; cách xa thì chèn nhiều.
        line += gap < unit * 0.15 ? '' : gap > unit * 2.5 ? '   ' : ' '
      }
      line += text
      end = piece.x + piece.width
    }
    return line
  })
}

/** Văn bản của cả trang, hoặc `undefined` khi trang gần như không có chữ (ảnh quét: cần OCR). */
export function pageTextOrUndefined(items: ReadonlyArray<PdfTextItem>): string | undefined {
  const lines = textItemsToLines(items)
  const chars = lines.join('').replace(/\s/g, '').length
  return chars >= MIN_TEXT_CHARS ? lines.join('\n') : undefined
}
