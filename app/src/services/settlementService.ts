import { db } from '../db/db';
import { computeMealSettlement } from '../domain/settlementEngine';
import type { Meal, SettlementMode } from '../types';
import { loadActiveMeal } from './mealPeopleService';
import { PeopleError } from './peopleErrors';
import { t } from '../i18n';

const nowIso = () => new Date().toISOString();
const SETTLEMENT_MODES: SettlementMode[] = ['SELF_SETTLEMENT', 'HOST_MEDIATED'];

/** Đổi chế độ quyết toán của bữa (BR-6.5). Bữa đã lưu trữ bị khoá (R-8). */
export async function setSettlementMode(mealId: string, mode: SettlementMode): Promise<Meal> {
  if (!SETTLEMENT_MODES.includes(mode)) {
    throw new PeopleError('INVALID_SETTLEMENT_MODE', t('Chế độ quyết toán không hợp lệ.'), { mode });
  }
  return db.transaction('rw', db.meals, async () => {
    const meal = await loadActiveMeal(mealId);
    if (meal.settlementMode === mode) return meal;
    const updated: Meal = { ...meal, settlementMode: mode, updatedAt: nowIso() };
    await db.meals.put(updated);
    return updated;
  });
}

/**
 * Ghi hoặc xoá trạng thái "Đã chuyển" của các khoản chuyển tiền (R-7). Chỉ nhận khoá của khoản đang có trong
 * quyết toán; số tiền lúc tick được lưu lại để tick cũ tự mất hiệu lực nếu số tiền khoản đó thay đổi sau này.
 */
export async function setTransfersPaid(mealId: string, keys: string[], isPaid: boolean, now = new Date()): Promise<Meal> {
  return db.transaction('rw', [db.meals, db.members, db.sessions, db.invoices, db.items], async () => {
    const meal = await loadActiveMeal(mealId);
    const [members, sessions, invoices, items] = await Promise.all([
      db.members.toArray(),
      db.sessions.where('mealId').equals(mealId).toArray(),
      db.invoices.where('mealId').equals(mealId).toArray(),
      db.items.where('mealId').equals(mealId).toArray(),
    ]);
    const { transfers } = computeMealSettlement({ meal, members, sessions, invoices, items });
    const byKey = new Map(transfers.map((t) => [t.key, t] as const));
    const next = { ...meal.settlementStatuses };
    for (const key of keys) {
      const transfer = byKey.get(key);
      if (!transfer) throw new PeopleError('TRANSFER_NOT_FOUND', t('Không tìm thấy khoản chuyển tiền này.'), { key });
      if (isPaid) next[key] = { isPaid: true, paidAt: now.toISOString(), amount: transfer.amount };
      else delete next[key];
    }
    const updated: Meal = { ...meal, settlementStatuses: next, updatedAt: now.toISOString() };
    await db.meals.put(updated);
    return updated;
  });
}

/** Tick hoặc bỏ tick "Đã chuyển" cho một khoản chuyển tiền khi bữa đang hoạt động (BR-6.7). */
export async function toggleTransferPaid(mealId: string, key: string, isPaid: boolean, now = new Date()): Promise<Meal> {
  return setTransfersPaid(mealId, [key], isPaid, now);
}
