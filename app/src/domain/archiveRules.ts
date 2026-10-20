import type {
  ArchivedMealSummary,
  Invoice,
  Meal,
  MealSettlementResult,
  SessionKeo,
} from '../types';
import { t } from '../i18n'

/*
 * Điều kiện và đóng gói dữ liệu khi Lưu trữ bữa (Epic 7). Hàm thuần, không đọc DB.
 */

export type ArchiveBlockerReason = 'ALREADY_ARCHIVED' | 'NO_COST' | 'UNASSIGNED_ITEMS' | 'UNPAID_ENTITIES';

export interface ArchiveEligibility {
  canArchive: boolean;
  reason?: ArchiveBlockerReason;
  unassignedItemCount: number;
  /** Các khoản chuyển tiền chưa tick "Đã chuyển" (dạng "A → B") "Đã thanh toán" (BR-7.1). */
  unpaidEntityNames: string[];
  /** Thông báo tiếng Việt giải thích vì sao chưa lưu trữ được. */
  message?: string;
}

/** Kiểm tra một bữa có đủ điều kiện lưu trữ hay không (BR-7.1, R-1). */
export function checkArchiveEligibility(settlement: MealSettlementResult): ArchiveEligibility {
  const unpaidEntityNames = settlement.transfers
    .filter((t) => !t.isPaid)
    .map((t) => `${t.fromEntityName} → ${t.toEntityName}`);
  const base = { unassignedItemCount: settlement.unassignedItemCount, unpaidEntityNames };

  if (settlement.status !== 'ACTIVE') {
    return { ...base, canArchive: false, reason: 'ALREADY_ARCHIVED', message: t('Bữa đã được lưu trữ.') };
  }
  if (settlement.totalMealAmount <= 0) {
    return { ...base, canArchive: false, reason: 'NO_COST', message: t('Bữa chưa có chi phí để lưu trữ.') };
  }
  if (settlement.unassignedItemCount > 0) {
    return {
      ...base,
      canArchive: false,
      reason: 'UNASSIGNED_ITEMS',
      message: t('Còn {unassignedItemCount} món chưa có người ăn.', { unassignedItemCount: settlement.unassignedItemCount }),
    };
  }
  if (unpaidEntityNames.length > 0) {
    return {
      ...base,
      canArchive: false,
      reason: 'UNPAID_ENTITIES',
      message: t('Chưa tick đã chuyển: {v}.', { v: unpaidEntityNames.join(', ') }),
    };
  }
  return { ...base, canArchive: true };
}

export interface ArchivePayloadInput {
  meal: Meal;
  sessions: ReadonlyArray<SessionKeo>;
  invoices: ReadonlyArray<Invoice>;
  settlement: MealSettlementResult;
  nowIso: string;
}

export interface ArchivePayload {
  archivedMeal: Meal;
  archivedSessions: SessionKeo[];
  archivedSummary: ArchivedMealSummary;
}

/**
 * Đóng gói dữ liệu trước khi xoá hoá đơn và món (R-2, R-3):
 * tổng và người ứng của từng kèo, tổng kết toàn bữa, và đánh dấu bữa sang ARCHIVED.
 */
export function buildArchivedPayload({ meal, sessions, invoices, settlement, nowIso }: ArchivePayloadInput): ArchivePayload {
  const ordered = [...sessions].sort((a, b) => a.orderIndex - b.orderIndex);

  const archivedSessions: SessionKeo[] = ordered.map((session) => {
    const mine = invoices.filter((inv) => inv.sessionId === session.id);
    const paidByMember = new Map<string, number>();
    for (const inv of mine) {
      paidByMember.set(inv.payerMemberId, (paidByMember.get(inv.payerMemberId) ?? 0) + inv.totalAmount);
    }
    return {
      ...session,
      archivedTotalAmount: mine.reduce((sum, inv) => sum + inv.totalAmount, 0),
      archivedPayerSummary: [...paidByMember.entries()]
        .filter(([, paidAmount]) => paidAmount > 0)
        .map(([memberId, paidAmount]) => ({ memberId, paidAmount })),
    };
  });

  const archivedSummary: ArchivedMealSummary = {
    totalMealAmount: settlement.totalMealAmount,
    sessionsSummary: archivedSessions.map((session) => ({
      sessionId: session.id,
      sessionName: session.name,
      totalAmount: session.archivedTotalAmount ?? 0,
      invoiceCount: invoices.filter((inv) => inv.sessionId === session.id).length,
    })),
    entitiesSummary: settlement.entities.map((e) => ({
      entityId: e.entityId,
      entityName: e.entityName,
      isGroup: e.isGroup,
      memberNames: e.memberNames,
      totalPaid: e.totalPaid,
      totalOwed: e.totalOwed,
      netBalance: e.netBalance,
      isPaid: true,
    })),
    transfers: settlement.transfers.map((t) => ({
      fromEntityName: t.fromEntityName,
      toEntityName: t.toEntityName,
      amount: t.amount,
    })),
  };

  const archivedMeal: Meal = {
    ...meal,
    status: 'ARCHIVED',
    archivedAt: nowIso,
    updatedAt: nowIso,
    archivedSummary,
  };

  return { archivedMeal, archivedSessions, archivedSummary };
}
