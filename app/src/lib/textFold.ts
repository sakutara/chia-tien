/**
 * Bỏ dấu tiếng Việt (đ → d) và chữ thường, để so khớp văn bản không phụ thuộc vào việc OCR có đọc đúng dấu hay không.
 */
export function fold(text: string): string {
  return text
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
