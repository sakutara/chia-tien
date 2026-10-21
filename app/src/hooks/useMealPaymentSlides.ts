import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { localizeMember, localizeSession } from '../db/localize';
import { buildPaymentSlides, type PaymentSlide } from '../domain/paymentSlides';
import { computeMealSettlement } from '../domain/settlementEngine';
import { useLang } from '../i18n';

/** Các khoản chuyển tiền (kèm tài khoản nhận và dữ liệu QR) của một bữa, cập nhật theo thời gian thực. */
export function useMealPaymentSlides(mealId: string): PaymentSlide[] | undefined {
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
    const localized = members.map(localizeMember);
    const settlement = computeMealSettlement({ meal, members: localized, sessions: sessions.map(localizeSession), invoices, items });
    return buildPaymentSlides({ settlement, mealTitle: meal.title, people: localized.map((m) => ({ id: m.id, name: m.name, bank: m.bank })) });
  }, [mealId, lang]);
}
