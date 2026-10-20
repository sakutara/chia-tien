import { PeopleError } from '../services/peopleErrors';
import { t } from '../i18n';

/** Tên kèo tối đa (BR-4.2 / R-2). */
export const SESSION_NAME_MAX = 80;

const DEFAULT_NAME_PATTERN = /^(?:Kèo|Venue) \d+$/;
const defaultPrefix = () => `${t('Kèo')} `;

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
    throw new PeopleError('INVALID_SESSION_NAME', t('Tên kèo tối đa {max} ký tự.', { max: SESSION_NAME_MAX }));
  }
  return cleaned;
}

/** Tên tự đặt của kèo ở vị trí `orderIndex` (bắt đầu từ 0): `Kèo 1`, `Kèo 2`, … */
export function defaultSessionName(orderIndex: number): string {
  return `${defaultPrefix()}${orderIndex + 1}`;
}

/** Kèo còn tên tự đặt (chưa được người dùng đặt tên riêng) — dùng cho BR-4.10. */
export function isDefaultSessionName(name: string): boolean {
  return DEFAULT_NAME_PATTERN.test(name);
}

/** Tên kèo mặc định hiển thị theo ngôn ngữ hiện tại (`Kèo 2` ↔ `Venue 2`); tên người dùng tự đặt giữ nguyên (BR-9.9). */
export function localizeSessionName(name: string): string {
  const match = /^(?:Kèo|Venue) (\d+)$/.exec(name);
  return match ? `${defaultPrefix()}${match[1]}` : name;
}

/** Tên kèo gợi ý từ tên quán OCR: `Kèo <tên quán>`, không vượt giới hạn tên kèo. */
export function vendorSessionName(vendor: string): string {
  const cleanVendor = squash(vendor);
  const room = SESSION_NAME_MAX - defaultPrefix().length;
  return `${defaultPrefix()}${cleanVendor.slice(0, room).trim()}`;
}
