import type {
  InvoiceItem,
  Invoice,
  Member,
  MemberBreakdown,
  MemberChargeLine,
  Meal,
  MealSettlementResult,
  PaymentEntitySettlement,
  SessionKeo,
  SettlementTransfer,
} from '../types'
import { t } from '../i18n'

/*
 * Động cơ quyết toán toàn bữa (Epic 6). Hàm thuần: không đọc DB, không chạm DOM.
 * Thứ tự: chi phí từng người (R-1, R-2) → làm tròn phần dư lớn nhất (R-3) → gom thực thể (R-4)
 * → lệnh chuyển tiền theo chế độ (R-5, R-6) → trạng thái hoàn tất (R-7).
 */

export interface SettlementEngineInput {
  meal: Meal;
  members: ReadonlyArray<Member>;
  sessions: ReadonlyArray<SessionKeo>;
  invoices: ReadonlyArray<Invoice>;
  items: ReadonlyArray<InvoiceItem>;
}

interface Accumulator {
  paid: number;
  raw: number;
  paidInvoices: MemberBreakdown['paidInvoices'];
  chargeLines: MemberChargeLine[];
}

const FRACTION_EPSILON = 1e-9;

/** Khoá trạng thái tick của một khoản chuyển tiền. */
export const transferKey = (fromEntityId: string, toEntityId: string): string => `${fromEntityId}->${toEntityId}`;

/** Khoản chuyển tiền chưa gắn khoá và trạng thái tick (kết quả thuần của thuật toán ghép). */
export type TransferDraft = Omit<SettlementTransfer, 'key' | 'isPaid'>;

function emptyAccumulator(): Accumulator {
  return { paid: 0, raw: 0, paidInvoices: [], chargeLines: [] };
}

/** Tính toàn bộ bảng quyết toán của bữa (R-1…R-7). */
export function computeMealSettlement(input: SettlementEngineInput): MealSettlementResult {
  const { meal, members, sessions, invoices, items } = input;

  if (meal.status === 'ARCHIVED' && meal.archivedSummary) {
    return fromArchivedSummary(meal);
  }

  const nameById = new Map(members.map((m) => [m.id, m.name] as const));
  const sessionById = new Map(sessions.map((s) => [s.id, s] as const));
  const itemsByInvoice = new Map<string, InvoiceItem[]>();
  for (const it of items) {
    const list = itemsByInvoice.get(it.invoiceId);
    if (list) list.push(it);
    else itemsByInvoice.set(it.invoiceId, [it]);
  }

  const acc = new Map<string, Accumulator>();
  const accOf = (id: string): Accumulator => {
    let a = acc.get(id);
    if (!a) {
      a = emptyAccumulator();
      acc.set(id, a);
    }
    return a;
  };

  let totalMealAmount = 0;
  let unassignedAmount = 0;
  let unassignedItemCount = 0;

  // Bước 1 (R-1, R-2): chi phí từng hoá đơn, chỉ tính trên người tham gia kèo đó.
  for (const inv of invoices) {
    const session = sessionById.get(inv.sessionId);
    if (!session) continue;
    totalMealAmount += inv.totalAmount;
    const sessionMembers = new Set(session.participantIds);
    const sessionName = session.name;

    if (sessionMembers.has(inv.payerMemberId)) {
      const payer = accOf(inv.payerMemberId);
      payer.paid += inv.totalAmount;
      payer.paidInvoices.push({
        invoiceId: inv.id,
        sessionId: session.id,
        sessionName,
        vendorName: inv.vendorName,
        amount: inv.totalAmount,
      });
    }

    if (inv.splitType === 'EQUAL_TOTAL') {
      const equal = [...new Set(inv.equalSplitParticipantIds)].filter((id) => sessionMembers.has(id));
      if (equal.length === 0) {
        unassignedAmount += inv.totalAmount;
        continue;
      }
      const share = inv.totalAmount / equal.length;
      for (const memberId of equal) {
        const a = accOf(memberId);
        a.raw += share;
        a.chargeLines.push({
          sessionId: session.id,
          sessionName,
          invoiceId: inv.id,
          vendorName: inv.vendorName,
          kind: 'EQUAL_TOTAL',
          totalShares: equal.length,
          sourceAmount: inv.totalAmount,
          rawCost: share,
        });
      }
      continue;
    }

    for (const item of itemsByInvoice.get(inv.id) ?? []) {
      const consumers = item.consumers.filter((c) => sessionMembers.has(c.memberId) && c.shares > 0);
      const totalShares = consumers.reduce((sum, c) => sum + c.shares, 0);
      if (totalShares === 0) {
        unassignedAmount += item.finalAmount;
        unassignedItemCount += 1;
        continue;
      }
      for (const c of consumers) {
        const share = (item.finalAmount * c.shares) / totalShares;
        const a = accOf(c.memberId);
        a.raw += share;
        a.chargeLines.push({
          sessionId: session.id,
          sessionName,
          invoiceId: inv.id,
          vendorName: inv.vendorName,
          kind: 'BY_ITEM',
          itemName: item.name,
          shares: c.shares,
          totalShares,
          sourceAmount: item.finalAmount,
          rawCost: share,
        });
      }
    }
  }

  const assignedAmount = totalMealAmount - unassignedAmount;
  const owedById = largestRemainderRound(acc, assignedAmount, meal.participantIds);

  // Bước 3 (R-4): gom thực thể thanh toán.
  const participantSet = new Set(meal.participantIds);
  const grouped = new Set<string>();
  const entities: PaymentEntitySettlement[] = [];
  for (const group of meal.paymentGroups) {
    const liveIds = group.memberIds.filter((id) => participantSet.has(id));
    if (liveIds.length < 2) continue;
    liveIds.forEach((id) => grouped.add(id));
    entities.push(
      buildEntity({
        entityId: group.id,
        entityName: group.name,
        isGroup: true,
        memberIds: liveIds,
        representativeId: group.representativeId,
        nameById,
        acc,
        owedById,
      }),
    );
  }
  for (const id of meal.participantIds) {
    if (grouped.has(id)) continue;
    entities.push(
      buildEntity({
        entityId: id,
        entityName: nameById.get(id) ?? t('Đã rời bữa'),
        isGroup: false,
        memberIds: [id],
        nameById,
        acc,
        owedById,
      }),
    );
  }

  const hostEntityId = entities.find((e) => e.memberIds.includes(meal.hostMemberId))?.entityId ?? meal.hostMemberId;
  const drafts =
    meal.settlementMode === 'HOST_MEDIATED'
      ? computeHostMediatedTransfers(entities, hostEntityId)
      : computeSelfSettlementTransfers(entities);
  const transfers: SettlementTransfer[] = drafts.map((t) => {
    const key = transferKey(t.fromEntityId, t.toEntityId);
    const status = meal.settlementStatuses[key];
    const isPaid = status?.isPaid === true && (status.amount === undefined || status.amount === t.amount);
    return { ...t, key, isPaid };
  });
  // Thực thể "đã xong" khi mọi khoản chuyển liên quan tới nó đã được tick.
  for (const e of entities) {
    e.isPaid = transfers.filter((t) => t.fromEntityId === e.entityId || t.toEntityId === e.entityId).every((t) => t.isPaid);
  }

  const memberIds = [...new Set([...meal.participantIds, ...acc.keys()])];
  const memberBreakdowns: MemberBreakdown[] = memberIds.map((memberId) => {
    const a = acc.get(memberId) ?? emptyAccumulator();
    const totalOwed = owedById.get(memberId) ?? 0;
    return {
      memberId,
      memberName: nameById.get(memberId) ?? t('Đã rời bữa'),
      paidInvoices: a.paidInvoices,
      chargeLines: a.chargeLines,
      totalPaid: a.paid,
      rawOwed: a.raw,
      totalOwed,
      netBalance: a.paid - totalOwed,
    };
  });

  const paidTransferCount = transfers.filter((t) => t.isPaid).length;
  const hasCost = invoices.length > 0;

  return {
    mealId: meal.id,
    status: meal.status,
    settlementMode: meal.settlementMode,
    hostMemberId: meal.hostMemberId,
    hostEntityId,
    totalMealAmount,
    assignedAmount,
    unassignedAmount,
    unassignedItemCount,
    memberBreakdowns,
    entities,
    transfers,
    transferCount: transfers.length,
    paidTransferCount,
    isAllSettled: hasCost && unassignedItemCount === 0 && paidTransferCount === transfers.length,
  };
}

/**
 * R-3: làm tròn chi phí về đồng bằng phương pháp phần dư lớn nhất để Σ Owed = assignedAmount.
 * Phần thiếu được cộng 1đ cho các thành viên có phần thập phân lớn nhất; hoà thì theo thứ tự tham gia bữa.
 */
function largestRemainderRound(
  acc: Map<string, Accumulator>,
  assignedAmount: number,
  participantIds: string[],
): Map<string, number> {
  const ids = [...new Set([...participantIds, ...acc.keys()])];
  const base = new Map<string, number>();
  const frac = new Map<string, number>();
  for (const id of ids) {
    const raw = acc.get(id)?.raw ?? 0;
    const floor = Math.floor(raw);
    base.set(id, floor);
    frac.set(id, raw - floor);
  }

  const baseSum = ids.reduce((sum, id) => sum + (base.get(id) ?? 0), 0);
  const deficit = Math.round(assignedAmount) - baseSum;
  const candidates = ids
    .filter((id) => (acc.get(id)?.raw ?? 0) > 0)
    .sort((a, b) => {
      const diff = (frac.get(b) ?? 0) - (frac.get(a) ?? 0);
      if (Math.abs(diff) > FRACTION_EPSILON) return diff;
      return ids.indexOf(a) - ids.indexOf(b);
    });

  const bonusIds = new Set(deficit > 0 ? candidates.slice(0, deficit) : []);
  const result = new Map<string, number>();
  for (const id of ids) {
    result.set(id, (base.get(id) ?? 0) + (bonusIds.has(id) ? 1 : 0));
  }
  return result;
}

interface EntityInput {
  entityId: string;
  entityName: string;
  isGroup: boolean;
  memberIds: string[];
  representativeId?: string;
  nameById: Map<string, string>;
  acc: Map<string, Accumulator>;
  owedById: Map<string, number>;
}

function buildEntity(input: EntityInput): PaymentEntitySettlement {
  const totalPaid = input.memberIds.reduce((sum, id) => sum + (input.acc.get(id)?.paid ?? 0), 0);
  const totalOwed = input.memberIds.reduce((sum, id) => sum + (input.owedById.get(id) ?? 0), 0);
  const netBalance = totalPaid - totalOwed;
  return {
    entityId: input.entityId,
    entityName: input.entityName,
    isGroup: input.isGroup,
    memberIds: input.memberIds,
    memberNames: input.memberIds.map((id) => input.nameById.get(id) ?? t('Đã rời bữa')),
    representativeId: input.representativeId,
    totalPaid,
    totalOwed,
    netBalance,
    isPaid: true, // được tính lại sau khi đã có danh sách khoản chuyển
  };
}

/** R-5: Greedy Net-Balance Matching — ghép chủ nợ lớn nhất với con nợ lớn nhất, mỗi lần một khoản. */
export function computeSelfSettlementTransfers(
  entities: ReadonlyArray<Pick<PaymentEntitySettlement, 'entityId' | 'entityName' | 'netBalance'>>,
): TransferDraft[] {
  const creditors = entities
    .filter((e) => e.netBalance > 0)
    .map((e) => ({ id: e.entityId, name: e.entityName, amount: e.netBalance }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = entities
    .filter((e) => e.netBalance < 0)
    .map((e) => ({ id: e.entityId, name: e.entityName, amount: -e.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: TransferDraft[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({
      fromEntityId: debtor.id,
      fromEntityName: debtor.name,
      toEntityId: creditor.id,
      toEntityName: creditor.name,
      amount,
    });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) i += 1;
    if (creditor.amount === 0) j += 1;
  }
  return transfers;
}

/**
 * R-6: mọi thực thể khác chủ trì chuyển thiếu cho chủ trì; chủ trì hoàn trả phần dư.
 * Không bao giờ có khoản từ chủ trì (hay nhóm có chủ trì) cho chính họ.
 */
export function computeHostMediatedTransfers(
  entities: ReadonlyArray<Pick<PaymentEntitySettlement, 'entityId' | 'entityName' | 'netBalance'>>,
  hostEntityId: string,
): TransferDraft[] {
  const host = entities.find((e) => e.entityId === hostEntityId);
  const hostName = host?.entityName ?? t('Chủ trì');
  const transfers: TransferDraft[] = [];
  for (const e of entities) {
    if (e.entityId === hostEntityId || e.netBalance === 0) continue;
    if (e.netBalance < 0) {
      transfers.push({
        fromEntityId: e.entityId,
        fromEntityName: e.entityName,
        toEntityId: hostEntityId,
        toEntityName: hostName,
        amount: -e.netBalance,
      });
    } else {
      transfers.push({
        fromEntityId: hostEntityId,
        fromEntityName: hostName,
        toEntityId: e.entityId,
        toEntityName: e.entityName,
        amount: e.netBalance,
      });
    }
  }
  return transfers;
}

/** Bữa đã lưu trữ: dựng kết quả chỉ đọc từ `archivedSummary` (R-8). */
function fromArchivedSummary(meal: Meal): MealSettlementResult {
  const summary = meal.archivedSummary!;
  const entities: PaymentEntitySettlement[] = summary.entitiesSummary.map((e) => ({
    entityId: e.entityId,
    entityName: e.entityName,
    isGroup: e.isGroup,
    memberIds: [],
    memberNames: e.memberNames,
    totalPaid: e.totalPaid,
    totalOwed: e.totalOwed,
    netBalance: e.netBalance,
    isPaid: e.isPaid,
  }));
  const idByName = new Map(entities.map((e) => [e.entityName, e.entityId] as const));
  const idOf = (name: string) => idByName.get(name) ?? name;
  const transfers: SettlementTransfer[] = summary.transfers.map((t) => ({
    fromEntityId: idOf(t.fromEntityName),
    fromEntityName: t.fromEntityName,
    toEntityId: idOf(t.toEntityName),
    toEntityName: t.toEntityName,
    amount: t.amount,
    key: transferKey(idOf(t.fromEntityName), idOf(t.toEntityName)),
    isPaid: true,
  }));
  return {
    mealId: meal.id,
    status: meal.status,
    settlementMode: meal.settlementMode,
    hostMemberId: meal.hostMemberId,
    hostEntityId: meal.hostMemberId,
    totalMealAmount: summary.totalMealAmount,
    assignedAmount: summary.totalMealAmount,
    unassignedAmount: 0,
    unassignedItemCount: 0,
    memberBreakdowns: [],
    entities,
    transfers,
    transferCount: transfers.length,
    paidTransferCount: transfers.length,
    isAllSettled: entities.every((e) => e.isPaid),
  };
}
