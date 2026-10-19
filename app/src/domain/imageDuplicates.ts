import { fold } from '../lib/textFold'

/*
 * Phát hiện ảnh hoá đơn trùng bằng văn bản OCR đã lưu (BR-4.18). Hai ảnh chụp cùng một bill không giống nhau
 * từng byte, nên so sánh tập từ của văn bản (đã bỏ dấu): số tiền và tên món là những từ phân biệt hai bill.
 */

/** Văn bản ít hơn số từ này thì không đủ tin để kết luận trùng. */
export const MIN_TOKENS_FOR_DUPLICATE = 8
/** Độ giống (Jaccard) từ ngưỡng này trở lên coi là cùng một bill. */
export const DUPLICATE_THRESHOLD = 0.8

/** Tập từ của văn bản: bỏ dấu, chỉ giữ chữ và số, bỏ từ 1 ký tự. */
export function textTokens(text: string): Set<string> {
  const tokens = fold(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2)
  return new Set(tokens)
}

/** Độ giống Jaccard của hai văn bản OCR, từ 0 đến 1. Trả về 0 khi một bên quá ngắn để so. */
export function textSimilarity(a: string, b: string): number {
  const ta = textTokens(a)
  const tb = textTokens(b)
  if (ta.size < MIN_TOKENS_FOR_DUPLICATE || tb.size < MIN_TOKENS_FOR_DUPLICATE) return 0
  let common = 0
  for (const t of ta) if (tb.has(t)) common++
  return common / (ta.size + tb.size - common)
}

export interface OcrTextRecord {
  id: string
  ocrRawText?: string
}

export interface DuplicateHit<T extends OcrTextRecord> {
  other: T
  similarity: number
}

/** Các ảnh trong `others` có văn bản OCR giống `target` từ ngưỡng trở lên, giống nhiều nhất trước. */
export function findTextDuplicates<T extends OcrTextRecord>(
  target: OcrTextRecord,
  others: T[],
  threshold: number = DUPLICATE_THRESHOLD,
): Array<DuplicateHit<T>> {
  if (!target.ocrRawText) return []
  const hits: Array<DuplicateHit<T>> = []
  for (const other of others) {
    if (other.id === target.id || !other.ocrRawText) continue
    const similarity = textSimilarity(target.ocrRawText, other.ocrRawText)
    if (similarity >= threshold) hits.push({ other, similarity })
  }
  return hits.sort((x, y) => y.similarity - x.similarity)
}
