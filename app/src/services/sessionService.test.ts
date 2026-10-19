import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { ensureDefaultData } from '../db/seed';
import type { Invoice, InvoiceItem, Meal, SessionKeo } from '../types';
import { initMealPeople } from './mealPeopleService';
import {
  addSession,
  deleteSession,
  getSessionDeletePreview,
  moveSession,
  renameSession,
  setSessionParticipants,
} from './sessionService';

async function makeMeal(participantIds: string[], overrides: Partial<Meal> = {}): Promise<Meal> {
  const init = await initMealPeople();
  const now = new Date().toISOString();
  const meal: Meal = {
    id: crypto.randomUUID(),
    title: 'Bữa test',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds,
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

async function addMember(id: string, name: string): Promise<string> {
  const now = new Date().toISOString();
  await db.members.put({
    id,
    name,
    normalizedName: name.toLowerCase(),
    avatarColor: '#2D6A4F',
    createdAt: now,
    lastUsedAt: now,
  });
  return id;
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

async function sessionsOf(mealId: string): Promise<SessionKeo[]> {
  return (await db.sessions.where('mealId').equals(mealId).toArray()).sort((a, b) => a.orderIndex - b.orderIndex);
}

describe('sessionService', () => {
  let hostId: string;

  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });
    await ensureDefaultData();
    hostId = (await initMealPeople()).hostMemberId;
  });

  describe('addSession', () => {
    it('đặt tên mặc định theo thứ tự và lấy toàn bộ người trong bữa (R-2, R-4)', async () => {
      const bob = await addMember('bob', 'Bình');
      const meal = await makeMeal([hostId, bob]);

      const first = await addSession(meal.id);
      const second = await addSession(meal.id, '  Karaoke   Nice ');

      expect(first).toMatchObject({ name: 'Kèo 1', orderIndex: 0, participantIds: [hostId, bob] });
      expect(second).toMatchObject({ name: 'Karaoke Nice', orderIndex: 1 });
    });

    it('từ chối tên quá dài và bữa đã lưu trữ', async () => {
      const meal = await makeMeal([hostId]);
      await expectCode(addSession(meal.id, 'x'.repeat(81)), 'INVALID_SESSION_NAME');

      const archived = await makeMeal([hostId], { status: 'ARCHIVED' });
      await expectCode(addSession(archived.id), 'MEAL_ARCHIVED');
    });
  });

  describe('renameSession', () => {
    it('để trống thì quay về tên mặc định theo vị trí', async () => {
      const meal = await makeMeal([hostId]);
      const session = await addSession(meal.id, 'Lẩu');
      expect((await renameSession(session.id, 'Cafe')).name).toBe('Cafe');
      expect((await renameSession(session.id, '   ')).name).toBe('Kèo 1');
    });
  });

  describe('moveSession', () => {
    it('đổi chỗ với kèo liền kề và không làm gì ở đầu/cuối', async () => {
      const meal = await makeMeal([hostId]);
      const a = await addSession(meal.id, 'A');
      const b = await addSession(meal.id, 'B');

      await moveSession(b.id, 'UP');
      expect((await sessionsOf(meal.id)).map((s) => s.name)).toEqual(['B', 'A']);

      await moveSession(b.id, 'UP'); // đã ở đầu
      expect((await sessionsOf(meal.id)).map((s) => s.name)).toEqual(['B', 'A']);
      expect(a.orderIndex).toBe(0);
    });
  });

  describe('setSessionParticipants (US-4.1b)', () => {
    it('từ chối người không có trong bữa', async () => {
      const meal = await makeMeal([hostId]);
      const session = await addSession(meal.id);
      await expectCode(setSessionParticipants(session.id, [hostId, 'ghost']), 'SESSION_MEMBER_NOT_IN_MEAL');
    });

    it('không cho bỏ người đang ứng tiền của hoá đơn trong kèo', async () => {
      const bob = await addMember('bob', 'Bình');
      const meal = await makeMeal([hostId, bob]);
      const session = await addSession(meal.id);
      await db.invoices.put({
        id: 'inv1',
        mealId: meal.id,
        sessionId: session.id,
        payerMemberId: bob,
        equalSplitParticipantIds: [hostId, bob],
      } as unknown as Invoice);

      await expectCode(setSessionParticipants(session.id, [hostId]), 'SESSION_MEMBER_IN_USE');
    });

    it('gỡ người bị bỏ khỏi danh sách chia đều của hoá đơn', async () => {
      const bob = await addMember('bob', 'Bình');
      const cun = await addMember('cun', 'Cường');
      const meal = await makeMeal([hostId, bob, cun]);
      const session = await addSession(meal.id);
      await db.invoices.put({
        id: 'inv1',
        mealId: meal.id,
        sessionId: session.id,
        payerMemberId: hostId,
        equalSplitParticipantIds: [hostId, bob, cun],
      } as unknown as Invoice);

      await setSessionParticipants(session.id, [hostId, bob]);

      const inv = await db.invoices.get('inv1');
      expect(inv?.equalSplitParticipantIds).toEqual([hostId, bob]);
      expect((await db.sessions.get(session.id))?.participantIds).toEqual([hostId, bob]);
    });

    it('không để danh sách chia đều của hoá đơn bị rỗng', async () => {
      const bob = await addMember('bob', 'Bình');
      const meal = await makeMeal([hostId, bob]);
      const session = await addSession(meal.id);
      // Bình ứng tiền nhưng chỉ có Hoà chia đều; bỏ Hoà ra thì danh sách chia đều thành rỗng.
      await db.invoices.put({
        id: 'inv1',
        mealId: meal.id,
        sessionId: session.id,
        payerMemberId: bob,
        equalSplitParticipantIds: [hostId],
      } as unknown as Invoice);

      await expectCode(setSessionParticipants(session.id, [bob]), 'SESSION_EMPTY');
    });

    it('không cho bỏ hết mọi người khi kèo đã có hoá đơn (người ứng vẫn bị chặn)', async () => {
      const meal = await makeMeal([hostId]);
      const session = await addSession(meal.id);
      await db.invoices.put({
        id: 'inv1',
        mealId: meal.id,
        sessionId: session.id,
        payerMemberId: hostId,
        equalSplitParticipantIds: [hostId],
      } as unknown as Invoice);

      await expectCode(setSessionParticipants(session.id, []), 'SESSION_MEMBER_IN_USE');
    });

    it('cho phép rỗng khi kèo chưa có hoá đơn', async () => {
      const meal = await makeMeal([hostId]);
      const session = await addSession(meal.id);
      const updated = await setSessionParticipants(session.id, []);
      expect(updated.participantIds).toEqual([]);
    });
  });

  describe('deleteSession', () => {
    it('xoá sạch hoá đơn và món của kèo, đánh lại số thứ tự các kèo còn lại (R-3)', async () => {
      const meal = await makeMeal([hostId]);
      const a = await addSession(meal.id, 'A');
      const b = await addSession(meal.id, 'B');
      const c = await addSession(meal.id, 'C');
      await db.invoices.put({ id: 'invB', mealId: meal.id, sessionId: b.id } as unknown as Invoice);
      await db.items.put({ id: 'itB', mealId: meal.id, sessionId: b.id, invoiceId: 'invB' } as unknown as InvoiceItem);

      expect(await getSessionDeletePreview(b.id)).toEqual({ invoices: 1, items: 1, files: 0 });

      await deleteSession(b.id);

      expect(await db.invoices.get('invB')).toBeUndefined();
      expect(await db.items.get('itB')).toBeUndefined();
      expect((await sessionsOf(meal.id)).map((s) => [s.id, s.orderIndex])).toEqual([
        [a.id, 0],
        [c.id, 1],
      ]);
    });
  });
});
