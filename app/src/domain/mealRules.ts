import { formatDateVi, isYmdInRange } from '../lib/dates';
import { PeopleError } from '../services/peopleErrors';
import type { Meal, MealSummary } from '../types';
import { t } from '../i18n';

export const MEAL_TITLE_MAX = 100;
export const MEAL_NOTE_MAX = 500;

export interface MealDraft {
  title: string;
  date: string;
  note?: string;
}

/** R-1: bỏ ký tự điều khiển, gộp khoảng trắng, trim. Giữ nguyên hoa/thường. */
export function cleanMealTitle(raw: string): string {
  return raw.replace(/\p{C}/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function defaultMealTitle(ymd: string): string {
  return t('Bữa {v}', { v: formatDateVi(ymd) });
}

/**
 * R-1…R-3. Trả bản đã chuẩn hoá; ném `PeopleError` khi không hợp lệ.
 * Tên để trống không phải lỗi: tự đặt theo ngày.
 */
export function validateMealDraft(draft: MealDraft): MealDraft {
  if (!isYmdInRange(draft.date)) {
    throw new PeopleError('INVALID_DATE', t('Ngày không hợp lệ. Hãy chọn một ngày từ 01/01/2000 đến 31/12/2099.'));
  }

  const cleaned = cleanMealTitle(draft.title);
  if (cleaned.length > MEAL_TITLE_MAX) {
    throw new PeopleError('INVALID_TITLE', t('Tên bữa tối đa {MEAL_TITLE_MAX} ký tự.', { MEAL_TITLE_MAX }));
  }

  const note = (draft.note ?? '').replace(/\r\n?/g, '\n').trim();
  if (note.length > MEAL_NOTE_MAX) {
    throw new PeopleError('INVALID_NOTE', t('Ghi chú tối đa {MEAL_NOTE_MAX} ký tự.', { MEAL_NOTE_MAX }));
  }

  const result: MealDraft = { title: cleaned || defaultMealTitle(draft.date), date: draft.date };
  if (note) result.note = note;
  return result;
}

/** R-8: ngày giảm dần; cùng ngày thì bữa tạo sau đứng trước. Trả mảng mới. */
export function sortMeals<T extends { date: string; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return 0;
  });
}

/** Gom theo ngày cho lịch; mỗi nhóm giữ thứ tự của đầu vào (đã sortMeals). */
export function groupByDate(summaries: MealSummary[]): Map<string, MealSummary[]> {
  const byDate = new Map<string, MealSummary[]>();
  for (const summary of summaries) {
    const list = byDate.get(summary.meal.date);
    if (list) list.push(summary);
    else byDate.set(summary.meal.date, [summary]);
  }
  return byDate;
}

/** R-10: mỗi nhóm thanh toán là một thực thể, cộng các người tham gia chưa thuộc nhóm nào. */
export function paymentEntities(meal: Pick<Meal, 'participantIds' | 'paymentGroups'>): string[] {
  const grouped = new Set(meal.paymentGroups.flatMap((g) => g.memberIds));
  return [
    ...meal.paymentGroups.map((g) => g.id),
    ...meal.participantIds.filter((id) => !grouped.has(id)),
  ];
}

interface SummarizeInput {
  meal: Meal;
  sessionCount: number;
  invoices: ReadonlyArray<{ totalAmount: number }>;
  /** Có khi đã tính quyết toán: tiến độ đếm theo số khoản chuyển tiền (BR-6.9). */
  settlement?: { transferCount: number; paidTransferCount: number };
}

/** R-9…R-11. */
export function summarizeMeal({ meal, sessionCount, invoices, settlement }: SummarizeInput): MealSummary {
  const base = { meal, sessionCount, participantCount: meal.participantIds.length };

  if (meal.status === 'ARCHIVED') {
    const archived = meal.archivedSummary;
    if (archived) {
      return {
        ...base,
        totalAmount: archived.totalMealAmount,
        hasCost: true,
        paidCount: archived.transfers.length,
        entityCount: archived.transfers.length,
      };
    }
    return { ...base, totalAmount: 0, hasCost: false, paidCount: 0, entityCount: paymentEntities(meal).length };
  }

  return {
    ...base,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    hasCost: invoices.length > 0,
    paidCount: settlement ? settlement.paidTransferCount : 0,
    entityCount: settlement ? settlement.transferCount : 0,
  };
}
