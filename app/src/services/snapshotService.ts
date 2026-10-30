import { db } from '../db/db';
import { buildPaymentSlides, toSnapshotPayments, type PaymentSlide } from '../domain/paymentSlides';
import { buildItemShares, buildSnapshotPayload, buildSnapshotUrl, encodeCompactSnapshot } from '../domain/shareSnapshot';
import { computeMealSettlement, type SettlementEngineInput } from '../domain/settlementEngine';
import type { MealSettlementResult, MealSnapshotPayload } from '../types';
import { localizeMember, localizeSession } from '../db/localize';
import { PeopleError } from './peopleErrors';
import { t } from '../i18n';
import { formatMoney } from '../lib/money';

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
 * `withInvoices` kèm các món (theo kèo) mà người chuyển phải trả và số tiền phần của họ — không có phần của người khác.
 * Người nhận link không có đủ dữ liệu để xem khoản chuyển, số dư hay tài khoản của người khác.
 */
export function scopeSnapshot(
  data: SnapshotSource,
  payerEntityIds: ReadonlyArray<string> | null = null,
  withInvoices = false,
): ScopedSnapshot {
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
  const payers = [...new Set(chosen.map((s) => s.fromEntityId))]
    .map((id) => settlement.entities.find((e) => e.entityId === id))
    .filter((e) => e !== undefined);
  const shares = withInvoices ? buildItemShares(input, payers) : undefined;
  const encoded = encodeCompactSnapshot(input.meal.title, payments, shares);
  return { payload, encoded, snapshotUrl: buildSnapshotUrl(encoded) };
}

/** Đọc bữa từ IndexedDB rồi dựng snapshot (mặc định cho tất cả người phải chuyển) và kết quả quyết toán (US-8.1). */
export async function loadMealSnapshotPayload(
  mealId: string,
  now: Date = new Date(),
  payerEntityIds: ReadonlyArray<string> | null = null,
): Promise<LoadedMealSnapshot> {
  const meal = await db.meals.get(mealId);
  if (!meal) throw new PeopleError('MEAL_NOT_FOUND', t('Không tìm thấy bữa.'), { mealId });
  const [members, sessions, invoices, items] = await Promise.all([
    db.members.toArray(),
    db.sessions.where('mealId').equals(mealId).toArray(),
    db.invoices.where('mealId').equals(mealId).toArray(),
    db.items.where('mealId').equals(mealId).toArray(),
  ]);
  const input = { meal, members: members.map(localizeMember), sessions: sessions.map(localizeSession), invoices, items };
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
    throw new PeopleError('SHARE_FAILED', t('Thiết bị này không hỗ trợ chia sẻ trực tiếp. Hãy sao chép tin nhắn.'));
  }
  try {
    await navigator.share(data);
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return false;
    throw new PeopleError('SHARE_FAILED', t('Không mở được menu chia sẻ.'));
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
  if (!copied) throw new PeopleError('SHARE_FAILED', t('Không sao chép được. Hãy chọn và sao chép thủ công.'));
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
 * Liên kết mở thẳng Facebook / Zalo để chia sẻ link snapshot (không cần Web Share API, vốn chỉ có trên HTTPS).
 * Cả hai chỉ nhận đường dẫn; phần chữ của tin nhắn người dùng dán thêm bằng nút sao chép.
 */
export function buildShareTargets(url: string): ShareTarget[] {
  const q = encodeURIComponent(url);
  return [
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${q}` },
    { id: 'zalo', label: 'Zalo', href: `https://zalo.me/share?url=${q}` },
  ];
}

/** Thiết bị có chia sẻ được tệp ảnh qua menu hệ thống không. */
export function canShareFile(file: File): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/** Mở menu chia sẻ của thiết bị kèm tệp ảnh. Trả `false` khi người dùng tự đóng menu. */
export async function shareFileViaOs(data: { title: string; file: File }): Promise<boolean> {
  if (!canShareFile(data.file)) {
    throw new PeopleError('SHARE_FAILED', t('Thiết bị này không hỗ trợ chia sẻ trực tiếp. Hãy sao chép tin nhắn.'));
  }
  try {
    await navigator.share({ title: data.title, files: [data.file] });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return false;
    throw new PeopleError('SHARE_FAILED', t('Không mở được menu chia sẻ.'));
  }
}

/** Tải một tệp về máy qua thẻ <a download>. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nội dung chữ của một khoản chuyển tiền (ngân hàng, tài khoản, số tiền, nội dung) để các app nhận được khi chia sẻ. */
export function buildTransferText(slide: PaymentSlide): string {
  const lines = [t('Chuyển khoản cho {name}', { name: slide.toName })];
  if (slide.bank) lines.push(`${slide.bank.bankName} · ${slide.bank.accountName}`, `${t('Số tài khoản')}: ${slide.bank.accountNumber}`);
  lines.push(`${t('Số tiền')}: ${formatMoney(slide.amount)}`, `${t('Nội dung')}: ${slide.content}`);
  return lines.join('\n');
}

/**
 * Mở menu chia sẻ của hệ điều hành với thông tin chuyển tiền (ảnh QR + chữ) để người dùng chọn app ngân hàng đã cài.
 * Web không liệt kê được app trong máy, nên danh sách app do hệ điều hành hiển thị. Trả `false` khi người dùng đóng menu.
 */
export async function shareTransferToBankApp(slide: PaymentSlide): Promise<boolean> {
  const text = buildTransferText(slide);
  const title = t('Chuyển khoản cho {name}', { name: slide.toName });
  if (!canUseWebShare()) {
    await copyTextToClipboard(text);
    throw new PeopleError('SHARE_FAILED', t('Thiết bị này không hỗ trợ chia sẻ trực tiếp. Đã sao chép thông tin chuyển khoản.'));
  }
  let files: File[] = [];
  if (slide.qrPayload) {
    try {
      const { renderPaymentsPng } = await import('../lib/paymentImage');
      const blob = await renderPaymentsPng([slide]);
      const file = new File([blob], 'chuyen-khoan.png', { type: 'image/png' });
      if (canShareFile(file)) files = [file];
    } catch {
      // Không tạo được ảnh thì vẫn chia sẻ phần chữ.
    }
  }
  try {
    await navigator.share({ title, text, ...(files.length > 0 ? { files } : {}) });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return false;
    throw new PeopleError('SHARE_FAILED', t('Không mở được menu chia sẻ.'));
  }
}
