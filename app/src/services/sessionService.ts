import { generateId } from '../lib/id'
import { db } from '../db/db';
import { defaultSessionName, validateSessionName } from '../domain/sessionRules';
import type { SessionKeo } from '../types';
import { deleteFilesBySession } from './fileStorageService';
import { PeopleError } from './peopleErrors';
import { loadActiveMeal } from './mealPeopleService';
import { t } from '../i18n';

const nowIso = () => new Date().toISOString();

async function loadSession(sessionId: string): Promise<SessionKeo> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new PeopleError('SESSION_NOT_FOUND', t('Không tìm thấy kèo này.'), { sessionId });
  return session;
}

async function sessionsOfMeal(mealId: string): Promise<SessionKeo[]> {
  const sessions = await db.sessions.where('mealId').equals(mealId).toArray();
  return sessions.sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Thêm kèo vào cuối bữa; người tham gia mặc định là toàn bộ người đang có trong bữa (R-4). */
export async function addSession(mealId: string, name = ''): Promise<SessionKeo> {
  return db.transaction('rw', db.meals, db.sessions, async () => {
    const meal = await loadActiveMeal(mealId);
    const existing = await sessionsOfMeal(mealId);
    const orderIndex = existing.length;
    const session: SessionKeo = {
      id: generateId(),
      mealId,
      name: validateSessionName(name) || defaultSessionName(orderIndex),
      orderIndex,
      participantIds: [...meal.participantIds],
      createdAt: nowIso(),
    };
    await db.sessions.add(session);
    await db.meals.update(mealId, { updatedAt: nowIso() });
    return session;
  });
}

/** Đổi tên kèo. Để trống thì quay về tên mặc định theo vị trí. */
export async function renameSession(sessionId: string, name: string): Promise<SessionKeo> {
  return db.transaction('rw', db.meals, db.sessions, async () => {
    const session = await loadSession(sessionId);
    await loadActiveMeal(session.mealId);
    const updated: SessionKeo = {
      ...session,
      name: validateSessionName(name) || defaultSessionName(session.orderIndex),
    };
    await db.sessions.put(updated);
    await db.meals.update(session.mealId, { updatedAt: nowIso() });
    return updated;
  });
}

/** Đổi chỗ kèo với kèo liền trên hoặc liền dưới (R-3). Không làm gì nếu đã ở đầu/cuối. */
export async function moveSession(sessionId: string, direction: 'UP' | 'DOWN'): Promise<void> {
  await db.transaction('rw', db.meals, db.sessions, async () => {
    const session = await loadSession(sessionId);
    await loadActiveMeal(session.mealId);
    const ordered = await sessionsOfMeal(session.mealId);
    const at = ordered.findIndex((s) => s.id === sessionId);
    const neighbour = ordered[direction === 'UP' ? at - 1 : at + 1];
    if (!neighbour) return;
    await db.sessions.bulkPut([
      { ...session, orderIndex: neighbour.orderIndex },
      { ...neighbour, orderIndex: session.orderIndex },
    ]);
  });
}

/**
 * Đặt người tham gia kèo (US-4.1b, R-4…R-6).
 * - Chỉ nhận người đã có trong bữa.
 * - Không bỏ người đang là người ứng hoặc người ăn của hoá đơn/món trong kèo (SESSION_MEMBER_IN_USE).
 * - Người bị bỏ ra khỏi kèo được gỡ khỏi danh sách chia đều của các hoá đơn trong kèo.
 * - Kèo đã có hoá đơn thì không được rỗng.
 */
export async function setSessionParticipants(sessionId: string, memberIds: string[]): Promise<SessionKeo> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const session = await loadSession(sessionId);
    const meal = await loadActiveMeal(session.mealId);
    const next = [...new Set(memberIds)];

    const outsider = next.find((id) => !meal.participantIds.includes(id));
    if (outsider) {
      throw new PeopleError('SESSION_MEMBER_NOT_IN_MEAL', t('Chỉ chọn được người đã có trong bữa.'), { memberId: outsider });
    }

    const removed = session.participantIds.filter((id) => !next.includes(id));
    const invoices = await db.invoices.where('sessionId').equals(sessionId).toArray();
    const items = await db.items.where('sessionId').equals(sessionId).toArray();

    for (const memberId of removed) {
      const payerOf = invoices.some((inv) => inv.payerMemberId === memberId);
      const consumerOf = items.some((it) => it.consumers.some((c) => c.memberId === memberId));
      if (payerOf || consumerOf) {
        throw new PeopleError('SESSION_MEMBER_IN_USE', t('Người này đang ứng tiền hoặc ăn món trong kèo.'), { memberId });
      }
    }
    if (next.length === 0 && invoices.length > 0) {
      throw new PeopleError('SESSION_EMPTY', t('Kèo đã có hoá đơn nên phải có ít nhất một người tham gia.'));
    }

    // Chỉ ghi lại những hoá đơn thực sự thay đổi danh sách chia đều.
    const updatedInvoices = invoices.flatMap((inv) => {
      const equalSplit = inv.equalSplitParticipantIds.filter((id) => next.includes(id));
      return equalSplit.length === inv.equalSplitParticipantIds.length ? [] : [{ ...inv, equalSplitParticipantIds: equalSplit }];
    });
    if (updatedInvoices.some((inv) => inv.equalSplitParticipantIds.length === 0)) {
      throw new PeopleError('SESSION_EMPTY', t('Danh sách chia đều của hoá đơn không được rỗng.'));
    }

    const updated: SessionKeo = { ...session, participantIds: next };
    await db.sessions.put(updated);
    if (updatedInvoices.length > 0) await db.invoices.bulkPut(updatedInvoices);
    await db.meals.update(session.mealId, { updatedAt: nowIso() });
    return updated;
  });
}

export interface SessionDeletePreview {
  invoices: number;
  items: number;
  files: number;
}

/** Số lượng sẽ mất khi xoá kèo, để hộp xác nhận nêu rõ (BR-4.2). */
export async function getSessionDeletePreview(sessionId: string): Promise<SessionDeletePreview> {
  await loadSession(sessionId);
  const [invoices, items, files] = await Promise.all([
    db.invoices.where('sessionId').equals(sessionId).count(),
    db.items.where('sessionId').equals(sessionId).count(),
    db.invoice_files.where('sessionId').equals(sessionId).count(),
  ]);
  return { invoices, items, files };
}

/**
 * Xoá kèo cùng hoá đơn, món và file (BR-4.2, R-15).
 * File vật lý xoá trước, DB sau; sau đó đánh lại số thứ tự cho các kèo còn lại (R-3).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const session = await loadSession(sessionId);
  await deleteFilesBySession(sessionId);

  await db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items, db.invoice_files], async () => {
    await db.items.where('sessionId').equals(sessionId).delete();
    await db.invoices.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);

    const remaining = await sessionsOfMeal(session.mealId);
    await db.sessions.bulkPut(remaining.map((s, orderIndex) => ({ ...s, orderIndex })));
    await db.meals.update(session.mealId, { updatedAt: nowIso() });
  });
}
