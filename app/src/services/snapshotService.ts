import { db } from '../db/db';
import { buildPaymentSlides, toSnapshotPayments } from '../domain/paymentSlides';
import { buildSnapshotPayload, buildSnapshotUrl, encodeCompactSnapshot } from '../domain/shareSnapshot';
import { computeMealSettlement, type SettlementEngineInput } from '../domain/settlementEngine';
import type { MealSettlementResult, MealSnapshotPayload } from '../types';
import { PeopleError } from './peopleErrors';

export interface LoadedMealSnapshot {
  payload: MealSnapshotPayload;
  encoded: string;
  snapshotUrl: string;
  settlement: MealSettlementResult;
  /** Dữ liệu gốc để dựng lại snapshot cho một nhóm người nhận khác (`scopeSnapshot`). */
  data: SnapshotSource;
}

export interface SnapshotSource {
  input: SettlementEngineInput;
  settlement: MealSettlementResult;
  exportedAt: string;
}

export interface ScopedSnapshot {
  payload: MealSnapshotPayload;
  encoded: string;
  snapshotUrl: string;
}

/**
 * Dựng snapshot chỉ chứa các khoản chuyển tiền do những thực thể `payerEntityIds` phải chuyển (rỗng/null → tất cả).
 * Người nhận link không có đủ dữ liệu để xem khoản chuyển, số dư hay tài khoản của người khác.
 */
export function scopeSnapshot(data: SnapshotSource, payerEntityIds: ReadonlyArray<string> | null = null): ScopedSnapshot {
  const { input, settlement, exportedAt } = data;
  const slides = buildPaymentSlides({
    settlement,
    mealTitle: input.meal.title,
    people: input.members.map((m) => ({ id: m.id, name: m.name, bank: m.bank })),
  });
  const chosen = payerEntityIds && payerEntityIds.length > 0 ? slides.filter((s) => payerEntityIds.includes(s.fromEntityId)) : slides;
  const payments = toSnapshotPayments(chosen);
  const payload = buildSnapshotPayload({ ...input, exportedAt, payments });
  // Link chỉ mang các khoản chuyển tiền (định dạng gọn) để đủ ngắn cho một tin nhắn.
  const encoded = encodeCompactSnapshot(input.meal.title, payments);
  return { payload, encoded, snapshotUrl: buildSnapshotUrl(encoded) };
}

/** Đọc bữa từ IndexedDB rồi dựng snapshot (mặc định cho tất cả người phải chuyển) và kết quả quyết toán (US-8.1). */
export async function loadMealSnapshotPayload(
  mealId: string,
  now: Date = new Date(),
  payerEntityIds: ReadonlyArray<string> | null = null,
): Promise<LoadedMealSnapshot> {
  const meal = await db.meals.get(mealId);
  if (!meal) throw new PeopleError('MEAL_NOT_FOUND', 'Không tìm thấy bữa.', { mealId });
  const [members, sessions, invoices, items] = await Promise.all([
    db.members.toArray(),
    db.sessions.where('mealId').equals(mealId).toArray(),
    db.invoices.where('mealId').equals(mealId).toArray(),
    db.items.where('mealId').equals(mealId).toArray(),
  ]);
  const input = { meal, members, sessions, invoices, items };
  const settlement = computeMealSettlement(input);
  const data: SnapshotSource = { input, settlement, exportedAt: now.toISOString() };
  return { ...scopeSnapshot(data, payerEntityIds), settlement, data };
}

/** Trình duyệt có Web Share API không (BR-8.6, R-5). */
export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Mở menu chia sẻ của thiết bị. Trả `false` khi người dùng tự đóng menu (AbortError), không báo lỗi (R-5).
 */
export async function shareMessageViaOs(data: { title: string; text: string }): Promise<boolean> {
  if (!canUseWebShare()) {
    throw new PeopleError('SHARE_FAILED', 'Thiết bị này không hỗ trợ chia sẻ trực tiếp. Hãy sao chép tin nhắn.');
  }
  try {
    await navigator.share(data);
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return false;
    throw new PeopleError('SHARE_FAILED', 'Không mở được menu chia sẻ.');
  }
}

/** Sao chép văn bản; nếu Clipboard API không có quyền thì dùng textarea ẩn + execCommand. */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Rơi xuống phương án dự phòng bên dưới.
    }
  }
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // Gắn vào dialog đang mở (nếu có) để focus trap của Modal không chặn việc focus textarea.
  const host = previous?.closest('dialog') ?? document.body;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  area.style.fontSize = '16px'; // tránh iOS tự zoom
  host.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length); // iOS Safari cần cách này mới chọn được toàn bộ
  let copied = false;
  try {
    copied = typeof document.execCommand === 'function' && document.execCommand('copy');
  } finally {
    area.remove();
    previous?.focus();
  }
  if (!copied) throw new PeopleError('SHARE_FAILED', 'Không sao chép được. Hãy chọn và sao chép thủ công.');
}

/** Rút gọn link snapshot để hiển thị: giữ domain + vài ký tự đầu của phần mã hoá, phần còn lại thay bằng “…”. */
export function shortenSnapshotUrl(url: string, keep = 36): string {
  return url.length <= keep ? url : `${url.slice(0, keep)}…`;
}

export interface ShareTarget {
  id: string;
  label: string;
  href: string;
}

/**
 * Liên kết mở thẳng app khác (không cần Web Share API, vốn chỉ có trên HTTPS).
 * Hoạt động cả khi chạy qua http trong mạng LAN hoặc trình duyệt không hỗ trợ `navigator.share`.
 */
export function buildShareTargets(text: string): ShareTarget[] {
  const q = encodeURIComponent(text);
  return [
    { id: 'sms', label: 'Tin nhắn SMS', href: `sms:?&body=${q}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=%20&text=${q}` },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${q}` },
    { id: 'email', label: 'Email', href: `mailto:?body=${q}` },
  ];
}
