import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { sortMeals, summarizeMeal } from '../domain/mealRules';
import { computeMealSettlement } from '../domain/settlementEngine';
import type { Invoice, InvoiceItem, MealSummary } from '../types';

/**
 * Tóm tắt mọi bữa, đã xếp theo R-8. Là nguồn duy nhất cho cả ba chế độ xem (BR-3.7, BR-3.8).
 * Tiến độ thanh toán lấy từ quyết toán thật của từng bữa (BR-6.9). `undefined` khi đang tải.
 */
export function useMealSummaries(): MealSummary[] | undefined {
  return useLiveQuery(async () => {
    const [meals, sessions, invoices, items, members] = await Promise.all([
      db.meals.toArray(),
      db.sessions.toArray(),
      db.invoices.toArray(),
      db.items.toArray(),
      db.members.toArray(),
    ]);

    const sessionCounts = new Map<string, number>();
    for (const s of sessions) sessionCounts.set(s.mealId, (sessionCounts.get(s.mealId) ?? 0) + 1);

    const invoicesByMeal = new Map<string, Invoice[]>();
    for (const inv of invoices) {
      const list = invoicesByMeal.get(inv.mealId);
      if (list) list.push(inv);
      else invoicesByMeal.set(inv.mealId, [inv]);
    }

    const itemsByMeal = new Map<string, InvoiceItem[]>();
    for (const it of items) {
      const list = itemsByMeal.get(it.mealId);
      if (list) list.push(it);
      else itemsByMeal.set(it.mealId, [it]);
    }

    return sortMeals(meals).map((meal) => {
      const mealInvoices = invoicesByMeal.get(meal.id) ?? [];
      const settlement = computeMealSettlement({
        meal,
        members,
        sessions: sessions.filter((s) => s.mealId === meal.id),
        invoices: mealInvoices,
        items: itemsByMeal.get(meal.id) ?? [],
      });
      return summarizeMeal({
        meal,
        sessionCount: sessionCounts.get(meal.id) ?? 0,
        invoices: mealInvoices,
        settlement: meal.status === 'ACTIVE' ? settlement : undefined,
      });
    });
  }, []);
}
