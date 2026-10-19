import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { sortMembers } from '../domain/memberFilter';
import type { Meal, Member, PaymentGroup } from '../types';

export interface GroupView extends PaymentGroup {
  members: Member[];
}

export interface MealPeopleView {
  meal: Meal;
  participants: Member[];
  host: Member | undefined;
  groups: GroupView[];
}

/** Người tham gia, chủ trì và nhóm thanh toán của một bữa. `undefined` khi đang tải hoặc không có bữa. */
export function useMealPeople(mealId: string): MealPeopleView | null | undefined {
  return useLiveQuery(async () => {
    const meal = await db.meals.get(mealId);
    if (!meal) return null;

    const ids = new Set<string>([
      ...meal.participantIds,
      meal.hostMemberId,
      ...meal.paymentGroups.flatMap((g) => g.memberIds),
    ]);
    const found = await db.members.bulkGet([...ids]);
    const byId = new Map<string, Member>();
    found.forEach((m) => m && byId.set(m.id, m));

    const participants = sortMembers(
      meal.participantIds.map((id) => byId.get(id)).filter((m): m is Member => !!m),
    );
    const groups: GroupView[] = meal.paymentGroups.map((g) => ({
      ...g,
      members: g.memberIds.map((id) => byId.get(id)).filter((m): m is Member => !!m),
    }));

    return { meal, participants, host: byId.get(meal.hostMemberId), groups };
  }, [mealId]);
}
