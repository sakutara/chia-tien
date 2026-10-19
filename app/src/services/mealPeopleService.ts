import { generateId } from '../lib/id'
import { db } from '../db/db';
import { cleanName } from '../db/normalize';
import { defaultGroupName, shrinkGroups, validateGroupDraft } from '../domain/paymentGroupRules';
import type { Meal, Member, PaymentGroup } from '../types';
import { getOrCreateMember } from './memberService';
import { PeopleError } from './peopleErrors';

export const GROUP_NAME_MAX = 80;

const nowIso = () => new Date().toISOString();

/** Đọc bữa và kiểm tra còn hoạt động (R-14). Gọi trong transaction có `db.meals`. */
export async function loadActiveMeal(mealId: string): Promise<Meal> {
  const meal = await db.meals.get(mealId);
  if (!meal) throw new PeopleError('MEAL_NOT_FOUND', 'Không tìm thấy bữa.', { mealId });
  if (meal.status === 'ARCHIVED') {
    throw new PeopleError('MEAL_ARCHIVED', 'Bữa đã lưu trữ, không thể chỉnh sửa.', { mealId });
  }
  return meal;
}

/** Giá trị khởi tạo người trong bữa mới (R-8): chủ app là người chủ trì và người tham gia đầu tiên. */
export async function initMealPeople(): Promise<{ participantIds: string[]; hostMemberId: string }> {
  const settings = await db.settings.get('default');
  if (!settings) throw new Error('Chưa khởi tạo dữ liệu mặc định (ensureDefaultData).');
  return {
    participantIds: [settings.defaultHostMemberId],
    hostMemberId: settings.defaultHostMemberId,
  };
}

/** Khoá tick của một khoản chuyển (`from->to`) hoặc của một thực thể có liên quan tới một trong các `ids` không. */
function statusKeyTouches(key: string, ids: string[]): boolean {
  return ids.includes(key) || key.split('->').some((end) => ids.includes(end));
}

/** R-13: có khoản chuyển nào liên quan tới người/nhóm này đã được tick "Đã chuyển" không. */
export function hasPaidStatusAffected(meal: Meal, memberIds: string[], groupId?: string): boolean {
  const ids = groupId ? [...memberIds, groupId] : memberIds;
  return Object.entries(meal.settlementStatuses).some(([key, status]) => status.isPaid && statusKeyTouches(key, ids));
}

/** Xoá trạng thái tick của mọi khoản chuyển liên quan tới các mã này (vì số tiền/đối tượng có thể đã đổi). */
function withoutKeys(statuses: Meal['settlementStatuses'], ids: string[]): Meal['settlementStatuses'] {
  return Object.fromEntries(Object.entries(statuses).filter(([key]) => !statusKeyTouches(key, ids)));
}

/** Thêm một người đã có trong danh bạ vào bữa. Đã có thì không làm gì (idempotent). */
export async function addParticipant(mealId: string, memberId: string): Promise<void> {
  await db.transaction('rw', db.meals, db.members, async () => {
    const meal = await loadActiveMeal(mealId);
    const member = await db.members.get(memberId);
    if (!member) throw new PeopleError('MEMBER_NOT_FOUND', 'Không tìm thấy người này.', { memberId });
    if (meal.participantIds.includes(memberId)) return;

    const now = nowIso();
    await db.meals.put({ ...meal, participantIds: [...meal.participantIds, memberId], updatedAt: now });
    await db.members.update(memberId, { lastUsedAt: now });
  });
}

/**
 * R-2, R-7: tạo (nếu chưa có) và thêm vào bữa trong một transaction.
 * Nếu đã có người cùng tên thì chọn người đó, không tạo trùng.
 */
export async function createAndAddParticipant(
  mealId: string,
  rawName: string,
): Promise<{ member: Member; created: boolean }> {
  return db.transaction('rw', db.meals, db.members, async () => {
    const meal = await loadActiveMeal(mealId);
    const now = nowIso();
    const { member, created } = await getOrCreateMember(rawName, now);

    if (!meal.participantIds.includes(member.id)) {
      await db.meals.put({ ...meal, participantIds: [...meal.participantIds, member.id], updatedAt: now });
    }
    await db.members.update(member.id, { lastUsedAt: now });
    const saved = await db.members.get(member.id);
    return { member: saved ?? member, created };
  });
}

/** Các nơi người này đang được dùng trong bữa (R-12). */
async function memberUsages(mealId: string, memberId: string): Promise<Array<'payer' | 'consumer' | 'equalSplit'>> {
  const [invoices, items] = await Promise.all([
    db.invoices.where('mealId').equals(mealId).toArray(),
    db.items.where('mealId').equals(mealId).toArray(),
  ]);
  const reasons = new Set<'payer' | 'consumer' | 'equalSplit'>();
  for (const inv of invoices) {
    if (inv.payerMemberId === memberId) reasons.add('payer');
    if (inv.equalSplitParticipantIds.includes(memberId)) reasons.add('equalSplit');
  }
  for (const it of items) {
    if (it.consumers.some((c) => c.memberId === memberId)) reasons.add('consumer');
  }
  return [...reasons];
}

/**
 * Bỏ người khỏi bữa (R-8, R-10, R-11, R-12, R-13).
 * Không bỏ được chủ trì hoặc người đang gắn với hoá đơn/món.
 */
export async function removeParticipant(mealId: string, memberId: string): Promise<void> {
  await db.transaction('rw', db.meals, db.sessions, db.invoices, db.items, async () => {
    const meal = await loadActiveMeal(mealId);
    if (!meal.participantIds.includes(memberId)) return;
    if (meal.hostMemberId === memberId) {
      throw new PeopleError('HOST_REQUIRED', 'Đổi người chủ trì trước khi bỏ người này.', { memberId });
    }

    const reasons = await memberUsages(mealId, memberId);
    if (reasons.length > 0) {
      throw new PeopleError('MEMBER_IN_USE', 'Người này đang có trong hoá đơn hoặc món.', {
        memberId,
        reasons,
      });
    }

    // Người không còn dùng ở hoá đơn/món nào thì tự rời khỏi danh sách người tham gia các kèo của bữa
    // (kèo mới mặc định gồm cả bữa nên nếu chỉ chặn thì gần như không bao giờ bỏ được ai).
    const sessions = await db.sessions.where('mealId').equals(mealId).toArray();
    await db.sessions.bulkPut(
      sessions
        .filter((s) => s.participantIds.includes(memberId))
        .map((s) => ({ ...s, participantIds: s.participantIds.filter((id) => id !== memberId) })),
    );

    const { groups, dissolvedGroupIds } = shrinkGroups(meal.paymentGroups, [memberId]);
    const touchedGroupIds = meal.paymentGroups
      .filter((g) => g.memberIds.includes(memberId))
      .map((g) => g.id);

    await db.meals.put({
      ...meal,
      participantIds: meal.participantIds.filter((id) => id !== memberId),
      paymentGroups: groups,
      settlementStatuses: withoutKeys(meal.settlementStatuses, [memberId, ...touchedGroupIds, ...dissolvedGroupIds]),
      updatedAt: nowIso(),
    });
  });
}

/** Đổi người chủ trì của bữa; chỉ nhận người đã tham gia. */
export async function setHost(mealId: string, memberId: string): Promise<void> {
  await db.transaction('rw', db.meals, async () => {
    const meal = await loadActiveMeal(mealId);
    if (!meal.participantIds.includes(memberId)) {
      throw new PeopleError('NOT_PARTICIPANT', 'Chỉ có thể chọn chủ trì trong số người đã tham gia.', { memberId });
    }
    await db.meals.put({ ...meal, hostMemberId: memberId, updatedAt: nowIso() });
  });
}

interface GroupInput {
  name?: string;
  memberIds: string[];
  representativeId?: string;
}

/** Tên nhóm: rỗng -> tên mặc định (R-9); quá dài -> INVALID_NAME. */
async function resolveGroupName(raw: string | undefined, memberIds: string[]): Promise<string> {
  const cleaned = raw === undefined ? '' : cleanName(raw);
  if ([...cleaned].length > GROUP_NAME_MAX) {
    throw new PeopleError('INVALID_NAME', `Tên nhóm tối đa ${GROUP_NAME_MAX} ký tự.`);
  }
  if (cleaned) return cleaned;
  const members = await db.members.bulkGet(memberIds);
  return defaultGroupName(members.map((m) => m?.name ?? '').filter(Boolean));
}

async function memberNameMap(memberIds: string[]): Promise<Record<string, string>> {
  const members = await db.members.bulkGet(memberIds);
  return Object.fromEntries(memberIds.map((id, i) => [id, members[i]?.name ?? id]));
}

/** Tạo nhóm thanh toán (R-9, R-13). */
export async function createGroup(mealId: string, input: GroupInput): Promise<PaymentGroup> {
  return db.transaction('rw', db.meals, db.members, async () => {
    const meal = await loadActiveMeal(mealId);
    const names = await memberNameMap(input.memberIds);
    validateGroupDraft({
      memberIds: input.memberIds,
      participantIds: meal.participantIds,
      existingGroups: meal.paymentGroups,
      names,
    });

    const representativeId = input.representativeId ?? input.memberIds[0];
    if (!input.memberIds.includes(representativeId)) {
      throw new PeopleError('NOT_IN_GROUP', 'Đại diện phải thuộc nhóm.', { memberId: representativeId });
    }

    const group: PaymentGroup = {
      id: generateId(),
      mealId,
      name: await resolveGroupName(input.name, input.memberIds),
      memberIds: [...input.memberIds],
      representativeId,
    };
    await db.meals.put({
      ...meal,
      paymentGroups: [...meal.paymentGroups, group],
      settlementStatuses: withoutKeys(meal.settlementStatuses, input.memberIds),
      updatedAt: nowIso(),
    });
    return group;
  });
}

interface GroupPatch {
  name?: string;
  memberIds?: string[];
  representativeId?: string;
}

/** Sửa nhóm: đổi tên, thành phần hoặc đại diện (R-9, R-10, R-13). */
export async function updateGroup(mealId: string, groupId: string, patch: GroupPatch): Promise<PaymentGroup> {
  return db.transaction('rw', db.meals, db.members, async () => {
    const meal = await loadActiveMeal(mealId);
    const current = meal.paymentGroups.find((g) => g.id === groupId);
    if (!current) throw new PeopleError('GROUP_NOT_FOUND', 'Không tìm thấy nhóm.', { groupId });

    const memberIds = patch.memberIds ?? current.memberIds;
    const names = await memberNameMap(memberIds);
    validateGroupDraft({
      memberIds,
      participantIds: meal.participantIds,
      existingGroups: meal.paymentGroups,
      ignoreGroupId: groupId,
      names,
    });

    // R-10: giữ đại diện cũ nếu còn trong nhóm, không thì lấy người đầu tiên
    const keptRep = current.representativeId && memberIds.includes(current.representativeId)
      ? current.representativeId
      : memberIds[0];
    const representativeId = patch.representativeId ?? keptRep;
    if (!memberIds.includes(representativeId)) {
      throw new PeopleError('NOT_IN_GROUP', 'Đại diện phải thuộc nhóm.', { memberId: representativeId });
    }

    const updated: PaymentGroup = {
      ...current,
      name: patch.name === undefined ? current.name : await resolveGroupName(patch.name, memberIds),
      memberIds: [...memberIds],
      representativeId,
    };

    // R-13: đổi thành phần làm mất trạng thái của người vào/ra nhóm và của chính nhóm.
    const changed = [...new Set([...current.memberIds, ...memberIds])].filter(
      (id) => current.memberIds.includes(id) !== memberIds.includes(id),
    );
    const compositionChanged = changed.length > 0;
    const clearKeys = compositionChanged ? [...changed, groupId] : [];

    await db.meals.put({
      ...meal,
      paymentGroups: meal.paymentGroups.map((g) => (g.id === groupId ? updated : g)),
      settlementStatuses: withoutKeys(meal.settlementStatuses, clearKeys),
      updatedAt: nowIso(),
    });
    return updated;
  });
}

/** Giải tán nhóm; người trong nhóm trở về thanh toán cá nhân (R-13). */
export async function dissolveGroup(mealId: string, groupId: string): Promise<void> {
  await db.transaction('rw', db.meals, async () => {
    const meal = await loadActiveMeal(mealId);
    const current = meal.paymentGroups.find((g) => g.id === groupId);
    if (!current) throw new PeopleError('GROUP_NOT_FOUND', 'Không tìm thấy nhóm.', { groupId });

    await db.meals.put({
      ...meal,
      paymentGroups: meal.paymentGroups.filter((g) => g.id !== groupId),
      settlementStatuses: withoutKeys(meal.settlementStatuses, [groupId, ...current.memberIds]),
      updatedAt: nowIso(),
    });
  });
}
