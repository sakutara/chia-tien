import { generateId } from '../lib/id'
import { db } from '../db/db';
import { validateMealDraft, type MealDraft } from '../domain/mealRules';
import type { Meal } from '../types';
import { deleteFilesByMeal } from './fileStorageService';
import { initMealPeople } from './mealPeopleService';
import { PeopleError } from './peopleErrors';
import { t } from '../i18n';

export interface DeletePreview {
  sessions: number;
  invoices: number;
  items: number;
  files: number;
}

/** Tạo bữa mới (BR-3.1, R-4): ACTIVE, chủ trì và người tham gia duy nhất là "Tôi". */
export async function createMeal(draft: MealDraft, now: Date = new Date()): Promise<Meal> {
  const clean = validateMealDraft(draft);
  const init = await initMealPeople();
  const iso = now.toISOString();

  const meal: Meal = {
    id: generateId(),
    title: clean.title,
    date: clean.date,
    ...(clean.note ? { note: clean.note } : {}),
    status: 'ACTIVE',
    participantIds: init.participantIds,
    hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: iso,
    updatedAt: iso,
  };
  await db.meals.add(meal);
  return meal;
}

/** Sửa tên, ngày, ghi chú của bữa đang hoạt động (BR-3.2, R-5). */
export async function updateMealInfo(mealId: string, draft: MealDraft, now: Date = new Date()): Promise<Meal> {
  const clean = validateMealDraft(draft);

  return db.transaction('rw', db.meals, async () => {
    const meal = await db.meals.get(mealId);
    if (!meal) throw new PeopleError('MEAL_NOT_FOUND', t('Không tìm thấy bữa này.'));
    if (meal.status === 'ARCHIVED') throw new PeopleError('MEAL_ARCHIVED', t('Bữa đã lưu trữ không thể chỉnh sửa.'));

    const { note: _oldNote, ...rest } = meal;
    const updated: Meal = {
      ...rest,
      title: clean.title,
      date: clean.date,
      ...(clean.note ? { note: clean.note } : {}),
      updatedAt: now.toISOString(),
    };
    await db.meals.put(updated);
    return updated;
  });
}

/** Số lượng sẽ mất khi xoá bữa, để hộp xác nhận nêu rõ (R-7). */
export async function getDeletePreview(mealId: string): Promise<DeletePreview> {
  if (!(await db.meals.get(mealId))) throw new PeopleError('MEAL_NOT_FOUND', t('Không tìm thấy bữa này.'));
  const [sessions, invoices, items, files] = await Promise.all([
    db.sessions.where('mealId').equals(mealId).count(),
    db.invoices.where('mealId').equals(mealId).count(),
    db.items.where('mealId').equals(mealId).count(),
    db.invoice_files.where('mealId').equals(mealId).count(),
  ]);
  return { sessions, invoices, items, files };
}

/**
 * Xoá bữa và mọi thứ thuộc về nó (BR-3.3, R-6), cho cả bữa ACTIVE lẫn ARCHIVED.
 * File trước, vì nếu xoá DB trước mà xoá file lỗi thì file OPFS mất bản ghi trỏ tới và không dọn được nữa.
 * Thành viên trong danh bạ không bị đụng.
 */
export async function deleteMeal(mealId: string): Promise<void> {
  if (!(await db.meals.get(mealId))) throw new PeopleError('MEAL_NOT_FOUND', t('Không tìm thấy bữa này.'));

  await deleteFilesByMeal(mealId);

  await db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items, db.invoice_files], async () => {
    await db.items.where('mealId').equals(mealId).delete();
    await db.invoices.where('mealId').equals(mealId).delete();
    await db.invoice_files.where('mealId').equals(mealId).delete();
    await db.sessions.where('mealId').equals(mealId).delete();
    await db.meals.delete(mealId);
  });
}
