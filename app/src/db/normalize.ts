/**
 * Chuẩn hoá tên để tìm kiếm (Quick Filter) và sắp xếp A-Z:
 * lowercase, bỏ dấu tiếng Việt (NFD), đ/Đ -> d.
 */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/** Số ký tự tối đa của tên người (R-1). */
export const MEMBER_NAME_MAX = 50;

/**
 * R-1: bỏ ký tự điều khiển, gộp khoảng trắng, trim.
 * Trả chuỗi rỗng nếu không còn gì; việc kiểm độ dài do caller quyết định.
 */
export function cleanName(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/\p{C}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * R-1: tên hiển thị luôn capitalized — mỗi từ bắt đầu bằng chữ hoa, các chữ còn lại thường.
 * Từ mới bắt đầu sau khoảng trắng, dấu gạch nối hoặc dấu mở ngoặc.
 * `bình` -> `Bình`, `BÌNH` -> `Bình`, `văn an` -> `Văn An`, `anh-tuấn` -> `Anh-Tuấn`.
 */
export function formatMemberName(raw: string): string {
  return cleanName(raw)
    .toLocaleLowerCase('vi')
    .replace(/(^|[\s\-(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('vi'));
}

/** Có dấu tiếng Việt hay không (kể cả đ/Đ). Dùng cho R-6c. */
export function hasDiacritics(s: string): boolean {
  return /[̀-ͯ]/.test(s.normalize('NFD')) || /[đĐ]/.test(s);
}
