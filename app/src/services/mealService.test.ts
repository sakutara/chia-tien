// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { ensureDefaultData } from '../db/seed';
import type { Invoice, InvoiceItem, Meal } from '../types';
import { addFile } from './fileStorageService';
import { createMeal, deleteMeal, getDeletePreview, updateMealInfo } from './mealService';

// fake-indexeddb không clone được File của jsdom nên dùng File của Node (xem fileStorageService.test.ts).
const NODE_BUFFER: string = 'node:buffer';
type NodeFileCtor = new (bits: BlobPart[], name: string, options?: FilePropertyBag) => File;
const { File: NodeFile } = (await import(/* @vite-ignore */ NODE_BUFFER)) as { File: NodeFileCtor };

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

/** Dựng một bữa có dữ liệu con đầy đủ để kiểm tra xoá dây chuyền. */
async function seedMealTree(mealId: string, memberId: string) {
  const sessionId = `${mealId}-s1`;
  const invoiceId = `${mealId}-inv1`;
  await db.sessions.put({
    id: sessionId, mealId, name: 'Kèo 1', orderIndex: 0, participantIds: [memberId], createdAt: '2026-10-19',
  });
  await db.invoices.put({
    id: invoiceId, mealId, sessionId, payerMemberId: memberId, equalSplitParticipantIds: [memberId], totalAmount: 100_000,
  } as unknown as Invoice);
  await db.items.put({
    id: `${mealId}-it1`, mealId, sessionId, invoiceId, consumers: [{ memberId, shares: 1 }],
  } as unknown as InvoiceItem);
  await addFile({ mealId, sessionId, invoiceId, file: new NodeFile(['abc'], 'bill.jpg', { type: 'image/jpeg' }) });
}

async function countsFor(mealId: string) {
  return {
    meal: await db.meals.where('id').equals(mealId).count(),
    sessions: await db.sessions.where('mealId').equals(mealId).count(),
    invoices: await db.invoices.where('mealId').equals(mealId).count(),
    items: await db.items.where('mealId').equals(mealId).count(),
    files: await db.invoice_files.where('mealId').equals(mealId).count(),
  };
}

describe('mealService', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });
    await ensureDefaultData();
  });

  describe('createMeal (BR-3.1, R-4)', () => {
    it('creates an ACTIVE meal hosted by "Tôi" who is the only participant (AC-4)', async () => {
      const settings = (await db.settings.get('default'))!;
      const meal = await createMeal({ title: '  Lẩu   bò  ', date: '2026-10-19', note: 'mang ô' });

      expect(meal).toMatchObject({
        title: 'Lẩu bò',
        date: '2026-10-19',
        note: 'mang ô',
        status: 'ACTIVE',
        participantIds: [settings.defaultHostMemberId],
        hostMemberId: settings.defaultHostMemberId,
        settlementMode: 'SELF_SETTLEMENT',
        paymentGroups: [],
        settlementStatuses: {},
      });
      expect(meal.createdAt).toBe(meal.updatedAt);
      expect(await db.meals.get(meal.id)).toEqual(meal);
    });

    it('names an untitled meal after its date and omits an empty note (AC-3)', async () => {
      const meal = await createMeal({ title: '', date: '2026-03-05', note: '   ' });
      expect(meal.title).toBe('Bữa 05/03/2026');
      expect('note' in meal).toBe(false);
    });

    it('rejects invalid input without writing anything (AC-3)', async () => {
      await expectCode(createMeal({ title: 'x', date: '2026-02-30' }), 'INVALID_DATE');
      await expectCode(createMeal({ title: 'x'.repeat(101), date: '2026-10-19' }), 'INVALID_TITLE');
      await expectCode(createMeal({ title: 'x', date: '2026-10-19', note: 'n'.repeat(501) }), 'INVALID_NOTE');
      expect(await db.meals.count()).toBe(0);
    });

    it('keeps two meals independent (AC-4)', async () => {
      const a = await createMeal({ title: 'A', date: '2026-10-19' });
      const b = await createMeal({ title: 'B', date: '2026-10-19' });
      await db.meals.update(a.id, { participantIds: [...a.participantIds, 'extra'] });
      expect((await db.meals.get(b.id))!.participantIds).toEqual(b.participantIds);
    });
  });

  describe('updateMealInfo (BR-3.2, R-5)', () => {
    it('changes only title, date, note and updatedAt (AC-5)', async () => {
      const created = await createMeal({ title: 'Cũ', date: '2026-10-19', note: 'ghi chú' }, new Date(2026, 9, 19, 10));
      const updated = await updateMealInfo(created.id, { title: 'Mới', date: '2026-10-20' }, new Date(2026, 9, 21, 10));

      expect(updated.title).toBe('Mới');
      expect(updated.date).toBe('2026-10-20');
      expect('note' in updated).toBe(false);
      expect(updated.updatedAt > created.updatedAt).toBe(true);
      expect({ ...updated, title: '', date: '', updatedAt: '' }).toEqual({
        ...(({ note: _n, ...rest }) => rest)(created),
        title: '',
        date: '',
        updatedAt: '',
      });
    });

    it('refuses an archived meal and a missing meal (AC-5)', async () => {
      const meal = await createMeal({ title: 'x', date: '2026-10-19' });
      await db.meals.update(meal.id, { status: 'ARCHIVED' } as Partial<Meal>);
      await expectCode(updateMealInfo(meal.id, { title: 'y', date: '2026-10-19' }), 'MEAL_ARCHIVED');
      await expectCode(updateMealInfo('nope', { title: 'y', date: '2026-10-19' }), 'MEAL_NOT_FOUND');
      expect((await db.meals.get(meal.id))!.title).toBe('x');
    });

    it('validates input before writing', async () => {
      const meal = await createMeal({ title: 'x', date: '2026-10-19' });
      await expectCode(updateMealInfo(meal.id, { title: 'y', date: 'bad' }), 'INVALID_DATE');
      expect((await db.meals.get(meal.id))!.title).toBe('x');
    });
  });

  describe('deleteMeal (BR-3.3, R-6, AC-2)', () => {
    it('removes the meal and every child row and file, leaving other meals and members alone', async () => {
      const host = (await db.settings.get('default'))!.defaultHostMemberId;
      const doomed = await createMeal({ title: 'Xoá', date: '2026-10-19' });
      const kept = await createMeal({ title: 'Giữ', date: '2026-10-20' });
      await seedMealTree(doomed.id, host);
      await seedMealTree(kept.id, host);
      const membersBefore = await db.members.count();

      expect(await getDeletePreview(doomed.id)).toEqual({ sessions: 1, invoices: 1, items: 1, files: 1 });

      await deleteMeal(doomed.id);

      expect(await countsFor(doomed.id)).toEqual({ meal: 0, sessions: 0, invoices: 0, items: 0, files: 0 });
      expect(await countsFor(kept.id)).toEqual({ meal: 1, sessions: 1, invoices: 1, items: 1, files: 1 });
      expect(await db.members.count()).toBe(membersBefore);
    });

    it('can delete an archived meal (BR-3.3, AC-8)', async () => {
      const meal = await createMeal({ title: 'Cũ', date: '2026-01-01' });
      await db.meals.update(meal.id, { status: 'ARCHIVED' } as Partial<Meal>);
      await deleteMeal(meal.id);
      expect(await db.meals.get(meal.id)).toBeUndefined();
    });

    it('can delete a meal that has no children', async () => {
      const meal = await createMeal({ title: 'Trống', date: '2026-10-19' });
      expect(await getDeletePreview(meal.id)).toEqual({ sessions: 0, invoices: 0, items: 0, files: 0 });
      await deleteMeal(meal.id);
      expect(await db.meals.count()).toBe(0);
    });

    it('reports a missing meal for both preview and delete', async () => {
      await expectCode(deleteMeal('nope'), 'MEAL_NOT_FOUND');
      await expectCode(getDeletePreview('nope'), 'MEAL_NOT_FOUND');
    });
  });
});
