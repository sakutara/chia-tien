import { PeopleError } from '../services/peopleErrors';

/** Tên kèo tối đa (BR-4.2 / R-2). */
export const SESSION_NAME_MAX = 80;

const DEFAULT_NAME_PATTERN = /^Kèo \d+$/;
const DEFAULT_PREFIX = 'Kèo ';

/** Bỏ ký tự điều khiển (thay bằng khoảng trắng), gộp khoảng trắng, cắt đầu/cuối. */
function squash(raw: string): string {
  const withoutControls = Array.from(raw, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : ch;
  }).join('');
  return withoutControls.replace(/\s+/g, ' ').trim();
}

/**
 * Làm sạch tên kèo do người dùng nhập. Rỗng nghĩa là "dùng tên mặc định", nên trả về chuỗi rỗng.
 * Quá dài thì từ chối, không cắt âm thầm (khác với tên quán từ OCR).
 */
export function validateSessionName(raw: string): string {
  const cleaned = squash(raw);
  if (cleaned.length > SESSION_NAME_MAX) {
    throw new PeopleError('INVALID_SESSION_NAME', `Tên kèo tối đa ${SESSION_NAME_MAX} ký tự.`);
  }
  return cleaned;
}

/** Tên tự đặt của kèo ở vị trí `orderIndex` (bắt đầu từ 0): `Kèo 1`, `Kèo 2`, … */
export function defaultSessionName(orderIndex: number): string {
  return `${DEFAULT_PREFIX}${orderIndex + 1}`;
}

/** Kèo còn tên tự đặt (chưa được người dùng đặt tên riêng) — dùng cho BR-4.10. */
export function isDefaultSessionName(name: string): boolean {
  return DEFAULT_NAME_PATTERN.test(name);
}

/** Tên kèo gợi ý từ tên quán OCR: `Kèo <tên quán>`, không vượt giới hạn tên kèo. */
export function vendorSessionName(vendor: string): string {
  const cleanVendor = squash(vendor);
  const room = SESSION_NAME_MAX - DEFAULT_PREFIX.length;
  return `${DEFAULT_PREFIX}${cleanVendor.slice(0, room).trim()}`;
}
