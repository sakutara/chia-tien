import { db } from '../db/db';
import { buildArchivedPayload, checkArchiveEligibility, type ArchiveBlockerReason } from '../domain/archiveRules';
import { computeMealSettlement } from '../domain/settlementEngine';
import { deleteFilesByMeal } from './fileStorageService';
import { loadActiveMeal } from './mealPeopleService';
import { PeopleError, type PeopleErrorCode } from './peopleErrors';

const BLOCKER_CODE: Record<Exclude<ArchiveBlockerReason, 'ALREADY_ARCHIVED'>, PeopleErrorCode> = {
  NO_COST: 'ARCHIVE_EMPTY_MEAL',
  UNASSIGNED_ITEMS: 'ARCHIVE_UNASSIGNED_ITEMS',
  UNPAID_ENTITIES: 'ARCHIVE_UNPAID_ENTITIES',
};

export interface ArchivePreview {
  invoiceCount: number;
  itemCount: number;
  fileCount: number;
  totalFileBytes: number;
}

/** Đếm hoá đơn, món, file và dung lượng sẽ được dọn khi lưu trữ (BR-7.2). */
export async function getArchivePreview(mealId: string): Promise<ArchivePreview> {
  const [invoiceCount, itemCount, files] = await Promise.all([
    db.invoices.where('mealId').equals(mealId).count(),
    db.items.where('mealId').equals(mealId).count(),
    db.invoice_files.where('mealId').equals(mealId).toArray(),
  ]);
  return {
    invoiceCount,
    itemCount,
    fileCount: files.length,
    totalFileBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
  };
}

/**
 * Lưu trữ bữa (BR-7.3, R-1…R-4). Kiểm tra điều kiện trước, xoá file trước rồi mới ghi DB trong một transaction.
 * Bữa đã lưu trữ không thể mở lại (R-5).
 */
export async function archiveMeal(mealId: string, now: Date = new Date()): Promise<void> {
  const meal = await loadActiveMeal(mealId);
  const [members, sessions, invoices, items] = await Promise.all([
    db.members.toArray(),
    db.sessions.where('mealId').equals(mealId).toArray(),
    db.invoices.where('mealId').equals(mealId).toArray(),
    db.items.where('mealId').equals(mealId).toArray(),
  ]);
  const settlement = computeMealSettlement({ meal, members, sessions, invoices, items });
  const eligibility = checkArchiveEligibility(settlement);
  if (!eligibility.canArchive && eligibility.reason) {
    if (eligibility.reason === 'ALREADY_ARCHIVED') {
      throw new PeopleError('MEAL_ARCHIVED', 'Bữa đã lưu trữ, không thể chỉnh sửa.', { mealId });
    }
    throw new PeopleError(BLOCKER_CODE[eligibility.reason], eligibility.message ?? 'Chưa đủ điều kiện lưu trữ.', {
      mealId,
      unpaidEntityNames: eligibility.unpaidEntityNames,
      unassignedItemCount: eligibility.unassignedItemCount,
    });
  }

  const payload = buildArchivedPayload({ meal, sessions, invoices, settlement, nowIso: now.toISOString() });

  // File vật lý xoá trước; DB sau (R-4).
  await deleteFilesByMeal(mealId);

  await db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items, db.invoice_files], async () => {
    await loadActiveMeal(mealId);
    await db.items.where('mealId').equals(mealId).delete();
    await db.invoices.where('mealId').equals(mealId).delete();
    await db.invoice_files.where('mealId').equals(mealId).delete();
    await db.sessions.bulkPut(payload.archivedSessions);
    await db.meals.put(payload.archivedMeal);
  });
}
