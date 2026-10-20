/** Ngày dạng `YYYY-MM-DD` theo giờ địa phương. Không dùng toISOString() vì lệch UTC (BR Epic 3 R-2). */
import { LOCALES, getLang, type Lang } from '../i18n';

export const MIN_YMD = '2000-01-01';
export const MAX_YMD = '2099-12-31';

/** Thứ 2 → Chủ nhật (R-12). */
export function weekdayLabels(lang: Lang = getLang()): readonly string[] {
  return lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
}

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function toYmd(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function parseYmd(ymd: string): { year: number; month: number; day: number } | undefined {
  const match = YMD_PATTERN.exec(ymd);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // So lại các thành phần để loại ngày không có thật (2026-02-30 sẽ tràn sang tháng 3).
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return { year, month, day };
}

export function isValidYmd(ymd: string): boolean {
  return parseYmd(ymd) !== undefined;
}

/** Đúng định dạng, có thật và nằm trong [MIN_YMD, MAX_YMD] (chuỗi ISO so sánh được theo thứ tự chữ). */
export function isYmdInRange(ymd: string): boolean {
  return isValidYmd(ymd) && ymd >= MIN_YMD && ymd <= MAX_YMD;
}

export function todayLocal(now: Date = new Date()): string {
  return toYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** `2026-10-19` → `19/10/2026` (vi) hoặc `Oct 19, 2026` (en). Chuỗi không hợp lệ được trả nguyên. */
export function formatDate(ymd: string, lang: Lang = getLang()): string {
  const parts = parseYmd(ymd);
  if (!parts) return ymd;
  if (lang === 'en') {
    return new Date(parts.year, parts.month - 1, parts.day).toLocaleDateString(LOCALES.en, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}

/** Tên cũ của `formatDate` (giữ để không đổi các nơi gọi). */
export const formatDateVi = formatDate;

export interface CalendarDay {
  ymd: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/** Lưới tháng, tuần bắt đầu Thứ 2, đủ 5 hoặc 6 hàng (R-12). `month` từ 1 đến 12. */
export function buildMonthGrid(year: number, month: number, today: string = todayLocal()): CalendarDay[] {
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);

  const days: CalendarDay[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(year, month - 1, 1 - offset + i);
    const ymd = toYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    days.push({
      ymd,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
      isToday: ymd === today,
    });
  }
  return days;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12 + 12) % 12 + 1 };
}
