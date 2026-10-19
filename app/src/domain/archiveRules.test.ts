import { describe, expect, it } from 'vitest'
import type { Invoice, Meal, MealSettlementResult, SessionKeo } from '../types'
import { buildArchivedPayload, checkArchiveEligibility } from './archiveRules'

const NOW = '2026-10-19T10:00:00.000Z'

function settlement(overrides: Partial<MealSettlementResult> = {}): MealSettlementResult {
  return {
    mealId: 'm',
    status: 'ACTIVE',
    settlementMode: 'SELF_SETTLEMENT',
    hostMemberId: 'a',
    hostEntityId: 'a',
    totalMealAmount: 90_000,
    assignedAmount: 90_000,
    unassignedAmount: 0,
    unassignedItemCount: 0,
    memberBreakdowns: [],
    entities: [
      { entityId: 'a', entityName: 'An', isGroup: false, memberIds: ['a'], memberNames: ['An'], totalPaid: 90_000, totalOwed: 45_000, netBalance: 45_000, isPaid: false },
      { entityId: 'b', entityName: 'Bình', isGroup: false, memberIds: ['b'], memberNames: ['Bình'], totalPaid: 0, totalOwed: 45_000, netBalance: -45_000, isPaid: false },
    ],
    transfers: [{ fromEntityId: 'b', fromEntityName: 'Bình', toEntityId: 'a', toEntityName: 'An', amount: 45_000, key: 'b', isPaid: false }],
    transferCount: 1,
    paidTransferCount: 0,
    isAllSettled: false,
    ...overrides,
  }
}

describe('checkArchiveEligibility (BR-7.1, R-1)', () => {
  it('chặn bữa chưa có chi phí, còn món chưa gán, và liệt kê người chưa thanh toán', () => {
    expect(checkArchiveEligibility(settlement({ totalMealAmount: 0 })).reason).toBe('NO_COST')
    expect(checkArchiveEligibility(settlement({ unassignedItemCount: 2 })).reason).toBe('UNASSIGNED_ITEMS')

    const unpaid = checkArchiveEligibility(settlement())
    expect(unpaid.canArchive).toBe(false)
    expect(unpaid.reason).toBe('UNPAID_ENTITIES')
    expect(unpaid.unpaidEntityNames).toEqual(['Bình → An'])
  })

  it('cho phép khi mọi khoản chuyển đã tick; không có khoản nào thì không cần tick', () => {
    const ticked = settlement({
      transfers: [{ fromEntityId: 'b', fromEntityName: 'Bình', toEntityId: 'a', toEntityName: 'An', amount: 45_000, key: 'b->a', isPaid: true }],
      entities: [
        { entityId: 'a', entityName: 'An', isGroup: false, memberIds: ['a'], memberNames: ['An'], totalPaid: 90_000, totalOwed: 45_000, netBalance: 45_000, isPaid: true },
        { entityId: 'b', entityName: 'Bình', isGroup: false, memberIds: ['b'], memberNames: ['Bình'], totalPaid: 0, totalOwed: 45_000, netBalance: -45_000, isPaid: true },
      ],
    })
    expect(checkArchiveEligibility(ticked).canArchive).toBe(true)

    const selfBalanced = settlement({
      transfers: [],
      entities: [
        { entityId: 'a', entityName: 'An', isGroup: false, memberIds: ['a'], memberNames: ['An'], totalPaid: 45_000, totalOwed: 45_000, netBalance: 0, isPaid: true },
      ],
    })
    expect(checkArchiveEligibility(selfBalanced).canArchive).toBe(true)
  })

  it('bữa đã lưu trữ không thể lưu trữ lại', () => {
    expect(checkArchiveEligibility(settlement({ status: 'ARCHIVED' })).reason).toBe('ALREADY_ARCHIVED')
  })
})

describe('buildArchivedPayload (R-2, R-3)', () => {
  it('đóng gói tổng kèo, người ứng và tổng kết toàn bữa; đánh dấu ARCHIVED', () => {
    const meal: Meal = {
      id: 'm', title: 'Lẩu', date: '2026-10-19', status: 'ACTIVE', participantIds: ['a', 'b'], hostMemberId: 'a',
      settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: NOW, updatedAt: NOW,
    }
    const sessions: SessionKeo[] = [
      { id: 's2', mealId: 'm', name: 'Kèo 2', orderIndex: 1, participantIds: ['a', 'b'], createdAt: NOW },
      { id: 's1', mealId: 'm', name: 'Kèo 1', orderIndex: 0, participantIds: ['a', 'b'], createdAt: NOW },
    ]
    const invoice = (id: string, sessionId: string, payerMemberId: string, totalAmount: number) =>
      ({ id, sessionId, mealId: 'm', payerMemberId, totalAmount }) as Invoice

    const payload = buildArchivedPayload({
      meal,
      sessions,
      invoices: [invoice('i1', 's1', 'a', 60_000), invoice('i2', 's1', 'a', 30_000)],
      settlement: settlement({ entities: settlement().entities.map((e) => ({ ...e, isPaid: true })) }),
      nowIso: NOW,
    })

    expect(payload.archivedMeal.status).toBe('ARCHIVED')
    expect(payload.archivedMeal.archivedAt).toBe(NOW)
    expect(payload.archivedSummary.sessionsSummary.map((s) => s.sessionName)).toEqual(['Kèo 1', 'Kèo 2'])
    expect(payload.archivedSessions[0].archivedTotalAmount).toBe(90_000)
    expect(payload.archivedSessions[0].archivedPayerSummary).toEqual([{ memberId: 'a', paidAmount: 90_000 }])
    expect(payload.archivedSessions[1].archivedTotalAmount).toBe(0)
    expect(payload.archivedSessions[1].archivedPayerSummary).toEqual([])
    expect(payload.archivedSummary.entitiesSummary.every((e) => e.isPaid)).toBe(true)
  })
})
