import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { ensureDefaultData } from '../db/seed';
import type { Invoice, InvoiceItem, Meal } from '../types';
import {
  addGroupContactToMeal,
  addParticipant,
  createAndAddParticipant,
  createGroup,
  dissolveGroup,
  hasPaidStatusAffected,
  initMealPeople,
  removeParticipant,
  setHost,
  updateGroup,
} from './mealPeopleService';
import { PeopleError } from './peopleErrors';

async function makeMeal(overrides: Partial<Meal> = {}): Promise<Meal> {
  const init = await initMealPeople();
  const now = new Date().toISOString();
  const meal: Meal = {
    id: crypto.randomUUID(),
    title: 'Bữa test',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds: init.participantIds,
    hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  await db.meals.put(meal);
  return meal;
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

async function captureError(p: Promise<unknown>): Promise<PeopleError> {
  try {
    await p;
  } catch (e) {
    return e as PeopleError;
  }
  throw new Error('expected a rejection');
}

async function reload(id: string): Promise<Meal> {
  return (await db.meals.get(id))!;
}

describe('mealPeopleService', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });
    await ensureDefaultData();
  });

  describe('participants', () => {
    it('starts a new meal with the default host as the only participant (R-8)', async () => {
      const settings = await db.settings.get('default');
      const init = await initMealPeople();
      expect(init).toEqual({
        participantIds: [settings!.defaultHostMemberId],
        hostMemberId: settings!.defaultHostMemberId,
      });
    });

    it('adds a new person, saves them to the directory, and reuses them later (AC-4)', async () => {
      const meal1 = await makeMeal();
      const { member, created } = await createAndAddParticipant(meal1.id, 'cường');
      expect(created).toBe(true);
      expect(member.name).toBe('Cường');

      const meal2 = await makeMeal();
      const again = await createAndAddParticipant(meal2.id, 'CƯỜNG');
      expect(again.created).toBe(false);
      expect(again.member.id).toBe(member.id);
      expect((await reload(meal2.id)).participantIds).toContain(member.id);
    });

    it('does not duplicate a participant added twice', async () => {
      const meal = await makeMeal();
      const { member } = await createAndAddParticipant(meal.id, 'Dung');
      await createAndAddParticipant(meal.id, 'dung');
      await addParticipant(meal.id, member.id);
      const ids = (await reload(meal.id)).participantIds;
      expect(ids.filter((id) => id === member.id)).toHaveLength(1);
    });

    it('refuses to change an archived meal (AC-9, R-14)', async () => {
      const meal = await makeMeal({ status: 'ARCHIVED' });
      await expectCode(createAndAddParticipant(meal.id, 'Em'), 'MEAL_ARCHIVED');
      await expectCode(setHost(meal.id, meal.hostMemberId), 'MEAL_ARCHIVED');
    });

    it('reports a missing meal', async () => {
      await expectCode(createAndAddParticipant('nope', 'Em'), 'MEAL_NOT_FOUND');
    });

    it('blocks removing the host (R-8)', async () => {
      const meal = await makeMeal();
      await expectCode(removeParticipant(meal.id, meal.hostMemberId), 'HOST_REQUIRED');
    });

    it('blocks removing a person who is a payer on an invoice (R-12)', async () => {
      const meal = await makeMeal();
      const { member } = await createAndAddParticipant(meal.id, 'Bình');
      await db.invoices.put({
        id: 'inv1',
        mealId: meal.id,
        sessionId: 's1',
        payerMemberId: member.id,
        equalSplitParticipantIds: [],
      } as unknown as Invoice);
      await expectCode(removeParticipant(meal.id, member.id), 'MEMBER_IN_USE');
      const err = await captureError(removeParticipant(meal.id, member.id));
      expect(err.detail?.reasons).toEqual(['payer']);
    });

    it('blocks removing a person who eats an item (consumer, R-12)', async () => {
      const meal = await makeMeal();
      const { member } = await createAndAddParticipant(meal.id, 'Hà');
      await db.items.put({
        id: 'it1',
        mealId: meal.id,
        sessionId: 's1',
        invoiceId: 'inv1',
        consumers: [{ memberId: member.id, shares: 1 }],
      } as unknown as InvoiceItem);
      const err = await captureError(removeParticipant(meal.id, member.id));
      expect(err.code).toBe('MEMBER_IN_USE');
      expect(err.detail?.reasons).toEqual(['consumer']);
    });

    it('blocks removing a person in an equal-split invoice (equalSplit, R-12)', async () => {
      const meal = await makeMeal();
      const { member } = await createAndAddParticipant(meal.id, 'Khải');
      await db.invoices.put({
        id: 'inv2',
        mealId: meal.id,
        sessionId: 's1',
        payerMemberId: meal.hostMemberId,
        equalSplitParticipantIds: [member.id],
      } as unknown as Invoice);
      const err = await captureError(removeParticipant(meal.id, member.id));
      expect(err.code).toBe('MEMBER_IN_USE');
      expect(err.detail?.reasons).toEqual(['equalSplit']);
    });

    it('drops an unused person from every session participant list but leaves other sessions alone (R-12e)', async () => {
      const meal = await makeMeal();
      const other = await makeMeal();
      const { member } = await createAndAddParticipant(meal.id, 'Lan');
      const base = { mealId: meal.id, orderIndex: 0, createdAt: meal.createdAt };
      await db.sessions.bulkPut([
        { ...base, id: 's-a', name: 'Kèo 1', participantIds: [meal.hostMemberId, member.id] },
        { ...base, id: 's-b', name: 'Kèo 2', participantIds: [member.id] },
        { ...base, id: 's-c', name: 'Kèo 3', participantIds: [meal.hostMemberId] },
        { ...base, mealId: other.id, id: 's-other', name: 'Bữa khác', participantIds: [member.id] },
      ]);

      await removeParticipant(meal.id, member.id);

      expect((await db.sessions.get('s-a'))!.participantIds).toEqual([meal.hostMemberId]);
      expect((await db.sessions.get('s-b'))!.participantIds).toEqual([]);
      expect((await db.sessions.get('s-c'))!.participantIds).toEqual([meal.hostMemberId]);
      expect((await db.sessions.get('s-other'))!.participantIds).toEqual([member.id]);
    });

    it('keeps session lists untouched when removal is blocked by an invoice (R-12e)', async () => {
      const meal = await makeMeal();
      const { member } = await createAndAddParticipant(meal.id, 'Mai');
      await db.sessions.put({
        id: 's-x', mealId: meal.id, name: 'Kèo', orderIndex: 0, createdAt: meal.createdAt,
        participantIds: [member.id],
      });
      await db.invoices.put({
        id: 'inv-x', mealId: meal.id, sessionId: 's-x', payerMemberId: member.id, equalSplitParticipantIds: [],
      } as unknown as Invoice);
      await expectCode(removeParticipant(meal.id, member.id), 'MEMBER_IN_USE');
      expect((await db.sessions.get('s-x'))!.participantIds).toEqual([member.id]);
    });

    it('removes a person from the meal and from their group (AC-8)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      const e = await createAndAddParticipant(meal.id, 'Em');
      await createGroup(meal.id, { memberIds: [c.member.id, d.member.id, e.member.id] });

      await removeParticipant(meal.id, e.member.id);
      const after = await reload(meal.id);
      expect(after.participantIds).not.toContain(e.member.id);
      expect(after.paymentGroups).toHaveLength(1);
      expect(after.paymentGroups[0].memberIds).toEqual([c.member.id, d.member.id]);
    });

    it('dissolves a group that drops below two members (R-11)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      await createGroup(meal.id, { memberIds: [c.member.id, d.member.id] });
      await removeParticipant(meal.id, d.member.id);
      expect((await reload(meal.id)).paymentGroups).toEqual([]);
    });
  });

  describe('host', () => {
    it('only accepts a participant as host (R-8)', async () => {
      const meal = await makeMeal();
      const elsewhere = await makeMeal();
      const outsider = await createAndAddParticipant(elsewhere.id, 'Ngoài');
      await expectCode(setHost(meal.id, outsider.member.id), 'NOT_PARTICIPANT');
    });

    it('changes the host in one meal without touching another (AC-6)', async () => {
      const a = await makeMeal();
      const b = await makeMeal();
      const bình = await createAndAddParticipant(a.id, 'Bình');
      await addParticipant(b.id, bình.member.id);

      await setHost(a.id, bình.member.id);
      expect((await reload(a.id)).hostMemberId).toBe(bình.member.id);
      expect((await reload(b.id)).hostMemberId).toBe(b.hostMemberId);
    });
  });

  describe('payment groups', () => {
    it('creates a group with a default name and first member as representative (R-9, R-10)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      const g = await createGroup(meal.id, { memberIds: [c.member.id, d.member.id] });
      expect(g.name).toBe('Cường + Dung');
      expect(g.representativeId).toBe(c.member.id);
      expect((await reload(meal.id)).paymentGroups).toHaveLength(1);
    });

    it('refuses a member who is already in another group, and says which one (AC-3)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      const e = await createAndAddParticipant(meal.id, 'Em');
      await createGroup(meal.id, { name: 'Cặp đôi', memberIds: [c.member.id, d.member.id] });
      const err = await captureError(createGroup(meal.id, { memberIds: [d.member.id, e.member.id] }));
      expect(err.code).toBe('MEMBER_ALREADY_GROUPED');
      expect(err.detail?.groupName).toBe('Cặp đôi');
      expect((await reload(meal.id)).paymentGroups).toHaveLength(1);
    });

    it('rejects a group smaller than two (R-9)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      await expectCode(createGroup(meal.id, { memberIds: [c.member.id] }), 'GROUP_TOO_SMALL');
    });

    it('clears paid ticks for members when grouping (R-13)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      await db.meals.put({ ...(await reload(meal.id)), settlementStatuses: { [c.member.id]: { isPaid: true } } });
      await createGroup(meal.id, { memberIds: [c.member.id, d.member.id] });
      expect((await reload(meal.id)).settlementStatuses[c.member.id]).toBeUndefined();
    });

    it('renames without clearing ticks, but clears them when membership changes (R-13)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      const e = await createAndAddParticipant(meal.id, 'Em');
      const g = await createGroup(meal.id, { memberIds: [c.member.id, d.member.id] });
      await db.meals.put({ ...(await reload(meal.id)), settlementStatuses: { [g.id]: { isPaid: true } } });

      await updateGroup(meal.id, g.id, { name: 'Đôi' });
      expect((await reload(meal.id)).settlementStatuses[g.id]?.isPaid).toBe(true);

      await updateGroup(meal.id, g.id, { memberIds: [c.member.id, e.member.id] });
      expect((await reload(meal.id)).settlementStatuses[g.id]).toBeUndefined();
    });

    it('moves the representative when they leave the group (R-10)', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      const e = await createAndAddParticipant(meal.id, 'Em');
      const g = await createGroup(meal.id, { memberIds: [c.member.id, d.member.id, e.member.id] });
      const updated = await updateGroup(meal.id, g.id, { memberIds: [d.member.id, e.member.id] });
      expect(updated.representativeId).toBe(d.member.id);
    });

    it('dissolves a group and clears its keys', async () => {
      const meal = await makeMeal();
      const c = await createAndAddParticipant(meal.id, 'Cường');
      const d = await createAndAddParticipant(meal.id, 'Dung');
      const g = await createGroup(meal.id, { memberIds: [c.member.id, d.member.id] });
      await dissolveGroup(meal.id, g.id);
      expect((await reload(meal.id)).paymentGroups).toEqual([]);
      await expectCode(dissolveGroup(meal.id, g.id), 'GROUP_NOT_FOUND');
    });

    it('refuses group edits on an archived meal (R-14)', async () => {
      const meal = await makeMeal({ status: 'ARCHIVED' });
      await expectCode(createGroup(meal.id, { memberIds: [meal.hostMemberId, 'x'] }), 'MEAL_ARCHIVED');
    });
  });

  describe('hasPaidStatusAffected (R-13)', () => {
    it('is true only when a relevant key is ticked', () => {
      const meal = {
        settlementStatuses: { a: { isPaid: true }, g1: { isPaid: false } },
      } as unknown as Meal;
      expect(hasPaidStatusAffected(meal, ['a'])).toBe(true);
      expect(hasPaidStatusAffected(meal, ['b'], 'g1')).toBe(false);
      expect(hasPaidStatusAffected(meal, ['b'], 'g2')).toBe(false);
    });
  });
});

describe('nhóm lưu trong danh bạ', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await ensureDefaultData();
  });

  it('tạo nhóm trong bữa thì nhóm cũng được lưu vào danh bạ, đổi tên/thành viên thì cập nhật hồ sơ', async () => {
    const meal = await makeMeal();
    const c = await createAndAddParticipant(meal.id, 'Chi');
    const d = await createAndAddParticipant(meal.id, 'Dũng');
    const group = await createGroup(meal.id, { name: 'Cặp đôi', memberIds: [c.member.id, d.member.id] });

    const contact = await db.members.get(group.contactId!);
    expect(contact).toMatchObject({ name: 'Cặp đôi', groupMemberIds: [c.member.id, d.member.id] });

    await updateGroup(meal.id, group.id, { name: 'Vợ chồng' });
    expect((await db.members.get(group.contactId!))?.name).toBe('Vợ chồng');
  });

  it('thêm nhóm từ danh bạ vào bữa khác như một cá nhân: tự thêm thành viên và dựng nhóm', async () => {
    const first = await makeMeal();
    const c = await createAndAddParticipant(first.id, 'Chi');
    const d = await createAndAddParticipant(first.id, 'Dũng');
    const group = await createGroup(first.id, { name: 'Cặp đôi', memberIds: [c.member.id, d.member.id] });

    const second = await makeMeal();
    await addGroupContactToMeal(second.id, group.contactId!);
    await addGroupContactToMeal(second.id, group.contactId!); // idempotent

    const saved = (await db.meals.get(second.id))!;
    expect(saved.participantIds).toEqual(expect.arrayContaining([c.member.id, d.member.id]));
    expect(saved.paymentGroups).toHaveLength(1);
    expect(saved.paymentGroups[0]).toMatchObject({ name: 'Cặp đôi', contactId: group.contactId, memberIds: [c.member.id, d.member.id] });
  });

  it('từ chối khi thành viên đã ở nhóm khác trong bữa', async () => {
    const first = await makeMeal();
    const c = await createAndAddParticipant(first.id, 'Chi');
    const d = await createAndAddParticipant(first.id, 'Dũng');
    const group = await createGroup(first.id, { name: 'Cặp đôi', memberIds: [c.member.id, d.member.id] });

    const second = await makeMeal();
    await addParticipant(second.id, c.member.id);
    const e = await createAndAddParticipant(second.id, 'Em');
    await createGroup(second.id, { name: 'Nhóm khác', memberIds: [c.member.id, e.member.id] });
    await expectCode(addGroupContactToMeal(second.id, group.contactId!), 'MEMBER_ALREADY_GROUPED');
  });

  it('tên trùng hồ sơ nhóm không bị coi là một cá nhân khi tạo người mới', async () => {
    const meal = await makeMeal();
    const c = await createAndAddParticipant(meal.id, 'Chi');
    const d = await createAndAddParticipant(meal.id, 'Dũng');
    const group = await createGroup(meal.id, { name: 'Cặp Đôi', memberIds: [c.member.id, d.member.id] });
    const person = await createAndAddParticipant(meal.id, 'Cặp Đôi');
    expect(person.created).toBe(true);
    expect(person.member.id).not.toBe(group.contactId);
  });
});
