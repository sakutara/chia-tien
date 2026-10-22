import { generateId } from '../lib/id'
import { db } from '../db/db';
import {
  computeInvoice,
  normalizeItemConsumers,
  resolveSplitType,
  validateEqualSplit,
  type ComputedItem,
  type InvoiceRulesDraft,
  type ItemDraft,
} from '../domain/invoiceRules';
import { isDefaultSessionName, vendorSessionName } from '../domain/sessionRules';
import type { Invoice, InvoiceItem, InvoiceSplitType, ItemShare, Meal, SessionKeo } from '../types';
import { deleteFilesByInvoice } from './fileStorageService';
import { loadActiveMeal } from './mealPeopleService';
import { PeopleError } from './peopleErrors';
import { t } from '../i18n';

const nowIso = () => new Date().toISOString();

export interface InvoiceDraft extends InvoiceRulesDraft {
  /** Id tạo trước từ form để ảnh đính kèm khi đang soạn có đúng hoá đơn; bỏ trống thì tự sinh. */
  id?: string;
  sessionId: string;
  payerMemberId: string;
  /** Cách chia (Epic 5). Bỏ trống: `EQUAL_TOTAL`. TOTAL_ONLY luôn bị ép về `EQUAL_TOTAL`. */
  splitType?: InvoiceSplitType;
  /** Người chia đều (Epic 5). Bỏ trống: giữ người còn trong kèo (sửa) hoặc cả kèo (tạo mới). */
  equalSplitParticipantIds?: string[];
  /** Đặt true khi tên quán đến từ OCR: kèo còn tên mặc định thì đổi theo quán (BR-4.10). */
  autoNameSession?: boolean;
}

export interface InvoiceResult {
  invoice: Invoice;
  items: InvoiceItem[];
  /** Có khi kèo vừa được đổi tên theo quán. */
  renamedSessionTo?: string;
}

async function loadSession(sessionId: string): Promise<SessionKeo> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new PeopleError('SESSION_NOT_FOUND', t('Không tìm thấy kèo này.'), { sessionId });
  return session;
}

/** Người ứng và người chia đều phải thuộc người tham gia kèo (R-5, R-6). */
function assertPayerInSession(session: SessionKeo, payerMemberId: string): void {
  if (!session.participantIds.includes(payerMemberId)) {
    throw new PeopleError('PAYER_NOT_IN_SESSION', t('Người ứng tiền phải tham gia kèo này.'), { payerMemberId });
  }
}

/** Id các file đang gắn với hoá đơn, lấy từ bảng file là nguồn sự thật. */
async function fileIdsOf(invoiceId: string): Promise<string[]> {
  const files = await db.invoice_files.where('invoiceId').equals(invoiceId).toArray();
  return files.map((f) => f.id);
}

/** Đồng bộ `fileIds` của hoá đơn sau khi thêm hoặc xoá ảnh ngoài lúc lưu form. */
export async function syncInvoiceFileIds(invoiceId: string): Promise<void> {
  await db.transaction('rw', [db.invoices, db.invoice_files], async () => {
    const invoice = await db.invoices.get(invoiceId);
    if (!invoice) return;
    await db.invoices.put({ ...invoice, fileIds: await fileIdsOf(invoiceId) });
  });
}

/** Chia từng món: cả kèo cùng ăn, mỗi người một phần; dùng cho món chưa có người ăn. */
function everyoneShares(sessionParticipantIds: string[]): ItemShare[] {
  return sessionParticipantIds.map((memberId) => ({ memberId, shares: 1 }));
}

function toItemRows(
  computed: ComputedItem[],
  base: { mealId: string; sessionId: string; invoiceId: string },
  consumersById: Map<string, InvoiceItem['consumers']>,
  fallbackConsumers: InvoiceItem['consumers'] = [],
): InvoiceItem[] {
  return computed.map((it, orderIndex) => {
    const id = it.id ?? generateId();
    const kept = consumersById.get(id);
    return {
      ...base,
      id,
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      rawAmount: it.rawAmount,
      allocatedDiscountAmount: it.allocatedDiscountAmount,
      allocatedServiceAmount: it.allocatedServiceAmount,
      allocatedVatAmount: it.allocatedVatAmount,
      finalAmount: it.finalAmount,
      consumers: kept && kept.length > 0 ? kept : fallbackConsumers,
      orderIndex,
    };
  });
}

/**
 * Tạo hoá đơn trong kèo (BR-4.4). Hoá đơn và món được ghi trong một transaction.
 * Người chia đều mặc định là toàn bộ người tham gia kèo (R-6).
 */
export async function createInvoice(draft: InvoiceDraft): Promise<InvoiceResult> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items, db.invoice_files], async () => {
    const session = await loadSession(draft.sessionId);
    await loadActiveMeal(session.mealId);
    if (session.participantIds.length === 0) {
      throw new PeopleError('SESSION_EMPTY', t('Kèo chưa có người tham gia.'));
    }
    assertPayerInSession(session, draft.payerMemberId);

    const computed = computeInvoice(draft);
    const splitType = resolveSplitType(computed.inputMode, draft.splitType);
    const equalSplit = validateEqualSplit(draft.equalSplitParticipantIds ?? session.participantIds, session.participantIds);
    const invoiceId = draft.id ?? generateId();
    if (await db.invoices.get(invoiceId)) {
      throw new PeopleError('INVOICE_EXISTS', t('Hoá đơn này đã được lưu.'), { invoiceId });
    }
    const invoice: Invoice = {
      id: invoiceId,
      mealId: session.mealId,
      sessionId: session.id,
      vendorName: computed.vendorName,
      invoiceDate: computed.invoiceDate,
      payerMemberId: draft.payerMemberId,
      inputMode: computed.inputMode,
      splitType,
      equalSplitParticipantIds: equalSplit,
      subtotalAmount: computed.subtotalAmount,
      discountMode: draft.discount.mode,
      discountValue: draft.discount.value,
      discountAmount: computed.bill.discountAmount,
      serviceMode: draft.service.mode,
      serviceValue: draft.service.value,
      serviceAmount: computed.bill.serviceAmount,
      vatMode: draft.vat.mode,
      vatValue: draft.vat.value,
      vatAmount: computed.bill.vatAmount,
      totalAmount: computed.bill.totalAmount,
      fileIds: await fileIdsOf(invoiceId),
      createdAt: nowIso(),
    };
    const items = toItemRows(
      computed.items,
      { mealId: session.mealId, sessionId: session.id, invoiceId },
      new Map(),
      splitType === 'BY_ITEM' ? everyoneShares(session.participantIds) : [],
    );

    let renamedSessionTo: string | undefined;
    let savedSession = session;
    if (draft.autoNameSession && computed.vendorName && isDefaultSessionName(session.name)) {
      renamedSessionTo = vendorSessionName(computed.vendorName);
      savedSession = { ...session, name: renamedSessionTo };
      await db.sessions.put(savedSession);
    }

    await db.invoices.put(invoice);
    if (items.length > 0) await db.items.bulkPut(items);
    await db.meals.update(session.mealId, { updatedAt: nowIso() });
    return { invoice, items, renamedSessionTo };
  });
}

/**
 * Sửa hoá đơn. Món được ghép theo `id` để giữ danh sách người ăn (sẽ dùng ở Epic 5).
 * Danh sách chia đều giữ những người còn trong kèo; nếu rỗng thì lấy lại cả kèo.
 */
export async function updateInvoice(invoiceId: string, draft: InvoiceDraft): Promise<InvoiceResult> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items, db.invoice_files], async () => {
    const existing = await db.invoices.get(invoiceId);
    if (!existing) throw new PeopleError('INVOICE_NOT_FOUND', t('Không tìm thấy hoá đơn này.'), { invoiceId });
    const session = await loadSession(draft.sessionId);
    await loadActiveMeal(session.mealId);
    assertPayerInSession(session, draft.payerMemberId);

    const computed = computeInvoice(draft);
    const splitType = resolveSplitType(computed.inputMode, draft.splitType ?? existing.splitType);
    const oldItems = await db.items.where('invoiceId').equals(invoiceId).toArray();
    // Giữ người ăn đã gán theo item.id; bỏ người không còn trong kèo (B.8 rủi ro 4).
    const consumersById = new Map(
      oldItems.map((it) => [it.id, it.consumers.filter((c) => session.participantIds.includes(c.memberId))] as const),
    );

    const kept = existing.equalSplitParticipantIds.filter((id) => session.participantIds.includes(id));
    const equalSplit = draft.equalSplitParticipantIds
      ? validateEqualSplit(draft.equalSplitParticipantIds, session.participantIds)
      : kept.length > 0 ? kept : [...session.participantIds];
    const invoice: Invoice = {
      ...existing,
      vendorName: computed.vendorName,
      invoiceDate: computed.invoiceDate,
      payerMemberId: draft.payerMemberId,
      inputMode: computed.inputMode,
      splitType,
      equalSplitParticipantIds: equalSplit,
      subtotalAmount: computed.subtotalAmount,
      discountMode: draft.discount.mode,
      discountValue: draft.discount.value,
      discountAmount: computed.bill.discountAmount,
      serviceMode: draft.service.mode,
      serviceValue: draft.service.value,
      serviceAmount: computed.bill.serviceAmount,
      vatMode: draft.vat.mode,
      vatValue: draft.vat.value,
      vatAmount: computed.bill.vatAmount,
      totalAmount: computed.bill.totalAmount,
      fileIds: await fileIdsOf(invoiceId),
    };
    const items = toItemRows(
      computed.items,
      { mealId: session.mealId, sessionId: session.id, invoiceId },
      consumersById,
      splitType === 'BY_ITEM' ? everyoneShares(session.participantIds) : [],
    );

    await db.items.where('invoiceId').equals(invoiceId).delete();
    await db.invoices.put(invoice);
    if (items.length > 0) await db.items.bulkPut(items);

    let renamedSessionTo: string | undefined;
    if (draft.autoNameSession && computed.vendorName && isDefaultSessionName(session.name)) {
      renamedSessionTo = vendorSessionName(computed.vendorName);
      await db.sessions.put({ ...session, name: renamedSessionTo });
    }
    await db.meals.update(session.mealId, { updatedAt: nowIso() });
    return { invoice, items, renamedSessionTo };
  });
}

export interface InvoiceDeletePreview {
  items: number;
  files: number;
}

export async function getInvoiceDeletePreview(invoiceId: string): Promise<InvoiceDeletePreview> {
  if (!(await db.invoices.get(invoiceId))) {
    throw new PeopleError('INVOICE_NOT_FOUND', t('Không tìm thấy hoá đơn này.'), { invoiceId });
  }
  const [items, files] = await Promise.all([
    db.items.where('invoiceId').equals(invoiceId).count(),
    db.invoice_files.where('invoiceId').equals(invoiceId).count(),
  ]);
  return { items, files };
}

/** Xoá hoá đơn cùng món và file ảnh. File vật lý xoá trước, DB sau (R-15). */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  const invoice = await db.invoices.get(invoiceId);
  if (!invoice) throw new PeopleError('INVOICE_NOT_FOUND', t('Không tìm thấy hoá đơn này.'), { invoiceId });
  await loadActiveMeal(invoice.mealId);

  await deleteFilesByInvoice(invoiceId);
  await db.transaction('rw', [db.meals, db.invoices, db.items, db.invoice_files], async () => {
    await db.items.where('invoiceId').equals(invoiceId).delete();
    await db.invoices.delete(invoiceId);
    await db.meals.update(invoice.mealId, { updatedAt: nowIso() });
  });
}

/* ------------------------------------------------------------------ */
/* Epic 5: người ứng, chế độ chia, danh sách chia đều và Tầng 3 (món)  */
/* ------------------------------------------------------------------ */

export interface ItemInput extends Omit<ItemDraft, 'id'> {
  consumers?: ItemShare[];
}

/** Tải hoá đơn, kèo và bữa; bữa phải đang ACTIVE (R-14, BR-5.9). Gọi trong transaction. */
async function loadEditableInvoice(invoiceId: string): Promise<{ invoice: Invoice; session: SessionKeo; meal: Meal }> {
  const invoice = await db.invoices.get(invoiceId);
  if (!invoice) throw new PeopleError('INVOICE_NOT_FOUND', t('Không tìm thấy hoá đơn này.'), { invoiceId });
  const session = await loadSession(invoice.sessionId);
  const meal = await loadActiveMeal(invoice.mealId);
  return { invoice, session, meal };
}

/** Hoá đơn chỉ nhập tổng không có món nên mọi thao tác món đều bị khoá (R-2). */
function assertItemized(invoice: Invoice): void {
  if (invoice.inputMode === 'TOTAL_ONLY') {
    throw new PeopleError('SPLIT_TYPE_LOCKED', t('Hoá đơn chỉ nhập tổng tiền không có danh sách món.'), { invoiceId: invoice.id });
  }
}

async function loadInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const items = await db.items.where('invoiceId').equals(invoiceId).toArray();
  return items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

/**
 * Dựng lại hoá đơn ITEMIZED từ danh sách món mới: tính lại tổng và phân bổ (R-7), giữ người ăn
 * của từng món theo `id`, xoá món bị bỏ đi và ghi trong transaction đang mở (I-E5-5).
 */
async function saveItemized(
  invoice: Invoice,
  session: SessionKeo,
  meal: Meal,
  drafts: Array<ItemDraft & { consumers: ItemShare[] }>,
): Promise<InvoiceResult> {
  const computed = computeInvoice({
    inputMode: 'ITEMIZED',
    vendorName: invoice.vendorName,
    invoiceDate: invoice.invoiceDate,
    items: drafts,
    discount: { mode: invoice.discountMode, value: invoice.discountValue },
    service: { mode: invoice.serviceMode, value: invoice.serviceValue },
    vat: { mode: invoice.vatMode, value: invoice.vatValue },
  });

  const items: InvoiceItem[] = computed.items.map((it: ComputedItem, orderIndex) => ({
    id: it.id ?? generateId(),
    mealId: invoice.mealId,
    sessionId: invoice.sessionId,
    invoiceId: invoice.id,
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    rawAmount: it.rawAmount,
    allocatedDiscountAmount: it.allocatedDiscountAmount,
    allocatedServiceAmount: it.allocatedServiceAmount,
    allocatedVatAmount: it.allocatedVatAmount,
    finalAmount: it.finalAmount,
    consumers: normalizeItemConsumers(drafts[orderIndex].consumers, session.participantIds),
    orderIndex,
  }));

  const updated: Invoice = {
    ...invoice,
    subtotalAmount: computed.subtotalAmount,
    discountAmount: computed.bill.discountAmount,
    serviceAmount: computed.bill.serviceAmount,
    vatAmount: computed.bill.vatAmount,
    totalAmount: computed.bill.totalAmount,
  };

  const keep = new Set(items.map((it) => it.id));
  const stale = (await loadInvoiceItems(invoice.id)).filter((it) => !keep.has(it.id)).map((it) => it.id);
  await db.items.bulkDelete(stale);
  await db.items.bulkPut(items);
  await db.invoices.put(updated);
  await db.meals.update(meal.id, { updatedAt: nowIso() });
  return { invoice: updated, items };
}

/** Đổi người ứng toàn bộ hoá đơn; người ứng phải thuộc kèo (BR-5.1, R-1). */
export async function setInvoicePayer(invoiceId: string, payerMemberId: string): Promise<Invoice> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const { invoice, session, meal } = await loadEditableInvoice(invoiceId);
    assertPayerInSession(session, payerMemberId);
    const updated: Invoice = { ...invoice, payerMemberId };
    await db.invoices.put(updated);
    await db.meals.update(meal.id, { updatedAt: nowIso() });
    return updated;
  });
}

/** Đổi chế độ chia BY_ITEM ↔ EQUAL_TOTAL; giữ nguyên món và người ăn; bật BY_ITEM thì món chưa có người ăn gán cả kèo (BR-5.2, BR-5.4, R-3). */
export async function setInvoiceSplitType(invoiceId: string, splitType: InvoiceSplitType): Promise<Invoice> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const { invoice, session, meal } = await loadEditableInvoice(invoiceId);
    const resolved = resolveSplitType(invoice.inputMode, splitType);
    const updated: Invoice = { ...invoice, splitType: resolved };
    // Bật chia từng món: món chưa có người ăn tự động gán cả kèo.
    if (resolved === 'BY_ITEM' && invoice.inputMode === 'ITEMIZED') {
      const everyone = everyoneShares(session.participantIds);
      const empty = (await loadInvoiceItems(invoiceId)).filter((it) => it.consumers.length === 0);
      await db.items.bulkPut(empty.map((it) => ({ ...it, consumers: everyone })));
    }
    await db.invoices.put(updated);
    await db.meals.update(meal.id, { updatedAt: nowIso() });
    return updated;
  });
}

/** Cập nhật danh sách người cùng chia đều của hoá đơn (BR-5.5, R-4). */
export async function setEqualSplitParticipants(invoiceId: string, memberIds: string[]): Promise<Invoice> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const { invoice, session, meal } = await loadEditableInvoice(invoiceId);
    const equalSplitParticipantIds = validateEqualSplit(memberIds, session.participantIds);
    const updated: Invoice = { ...invoice, equalSplitParticipantIds };
    await db.invoices.put(updated);
    await db.meals.update(meal.id, { updatedAt: nowIso() });
    return updated;
  });
}

/** Thêm một món vào cuối hoá đơn ITEMIZED và tính lại toàn bộ phân bổ (BR-5.3, R-7). */
export async function addInvoiceItem(invoiceId: string, itemDraft: ItemInput): Promise<InvoiceResult> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const { invoice, session, meal } = await loadEditableInvoice(invoiceId);
    assertItemized(invoice);
    const existing = await loadInvoiceItems(invoiceId);
    const drafts = [
      ...existing.map((it) => ({ ...it, consumers: it.consumers })),
      { ...itemDraft, consumers: itemDraft.consumers ?? [] },
    ];
    return saveItemized(invoice, session, meal, drafts);
  });
}

/** Sửa thông tin một món, giữ nguyên người ăn; tính lại phân bổ (BR-5.3, R-7). */
export async function updateInvoiceItem(itemId: string, patch: ItemInput): Promise<InvoiceResult> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const target = await db.items.get(itemId);
    if (!target) throw new PeopleError('ITEM_NOT_FOUND', t('Không tìm thấy món này.'), { itemId });
    const { invoice, session, meal } = await loadEditableInvoice(target.invoiceId);
    assertItemized(invoice);
    const existing = await loadInvoiceItems(invoice.id);
    const drafts = existing.map((it) =>
      it.id === itemId
        ? { ...patch, id: itemId, consumers: it.consumers }
        : { ...it, consumers: it.consumers },
    );
    return saveItemized(invoice, session, meal, drafts);
  });
}

/** Xoá một món; không được xoá món cuối cùng của hoá đơn ITEMIZED (R-8). */
export async function deleteInvoiceItem(itemId: string): Promise<InvoiceResult> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const target = await db.items.get(itemId);
    if (!target) throw new PeopleError('ITEM_NOT_FOUND', t('Không tìm thấy món này.'), { itemId });
    const { invoice, session, meal } = await loadEditableInvoice(target.invoiceId);
    assertItemized(invoice);
    const existing = await loadInvoiceItems(invoice.id);
    if (existing.length <= 1) {
      throw new PeopleError('LAST_ITEM_CANNOT_DELETE', t('Hoá đơn phải có ít nhất một món. Hãy xoá cả hoá đơn hoặc đổi sang chỉ nhập tổng tiền.'), { itemId });
    }
    const drafts = existing
      .filter((it) => it.id !== itemId)
      .map((it) => ({ ...it, consumers: it.consumers }));
    return saveItemized(invoice, session, meal, drafts);
  });
}

/** Ghi người ăn và số phần của một món (BR-5.6, BR-5.7, R-5). */
export async function setItemConsumers(itemId: string, consumers: ItemShare[]): Promise<InvoiceItem> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const target = await db.items.get(itemId);
    if (!target) throw new PeopleError('ITEM_NOT_FOUND', t('Không tìm thấy món này.'), { itemId });
    const { session, meal } = await loadEditableInvoice(target.invoiceId);
    const updated: InvoiceItem = {
      ...target,
      consumers: normalizeItemConsumers(consumers, session.participantIds),
    };
    await db.items.put(updated);
    await db.meals.update(meal.id, { updatedAt: nowIso() });
    return updated;
  });
}

/**
 * Gán cùng một nhóm người ăn (mỗi người shares = 1) cho mọi món, hoặc chỉ những món còn trống
 * (`UNASSIGNED_ONLY`, BR-5.6, R-6). Hoá đơn TOTAL_ONLY không có món nên trả về mảng rỗng.
 */
export async function setAllItemsConsumers(
  invoiceId: string,
  memberIds: string[],
  mode: 'ALL_ITEMS' | 'UNASSIGNED_ONLY' = 'ALL_ITEMS',
): Promise<InvoiceItem[]> {
  return db.transaction('rw', [db.meals, db.sessions, db.invoices, db.items], async () => {
    const { invoice, session, meal } = await loadEditableInvoice(invoiceId);
    if (invoice.inputMode === 'TOTAL_ONLY') return [];
    const consumers = normalizeItemConsumers(
      memberIds.map((memberId) => ({ memberId, shares: 1 })),
      session.participantIds,
    );
    const targets = (await loadInvoiceItems(invoiceId)).filter(
      (it) => mode === 'ALL_ITEMS' || it.consumers.length === 0,
    );
    const updated = targets.map((it) => ({ ...it, consumers }));
    await db.items.bulkPut(updated);
    if (updated.length > 0) await db.meals.update(meal.id, { updatedAt: nowIso() });
    return updated;
  });
}
