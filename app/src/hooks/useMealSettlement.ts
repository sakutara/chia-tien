import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { localizeMember, localizeSession } from '../db/localize';
import { computeMealSettlement } from '../domain/settlementEngine';
import { useLang } from '../i18n';
import type { MealSettlementResult } from '../types';

/** Quyết toán của một bữa, cập nhật theo thời gian thực (Epic 6). `undefined` khi đang tải hoặc bữa không có. */
export function useMealSettlement(mealId: string): MealSettlementResult | undefined {
  const lang = useLang();
  return useLiveQuery(async () => {
    const meal = await db.meals.get(mealId);
    if (!meal) return undefined;
    const [members, sessions, invoices, items] = await Promise.all([
      db.members.toArray(),
      db.sessions.where('mealId').equals(mealId).toArray(),
      db.invoices.where('mealId').equals(mealId).toArray(),
      db.items.where('mealId').equals(mealId).toArray(),
    ]);
    return computeMealSettlement({ meal, members: members.map(localizeMember), sessions: sessions.map(localizeSession), invoices, items });
  }, [mealId, lang]);
}
