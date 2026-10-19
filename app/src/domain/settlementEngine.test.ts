import { describe, expect, it } from 'vitest'
import type { Invoice, InvoiceItem, Meal, Member, SessionKeo } from '../types'
import {
  computeHostMediatedTransfers,
  computeMealSettlement,
  computeSelfSettlementTransfers,
} from './settlementEngine'

const NOW = '2026-10-19T10:00:00.000Z'

function member(id: string, name = id): Member {
  return { id, name, normalizedName: name.toLowerCase(), avatarColor: '#2D6A4F', createdAt: NOW, lastUsedAt: NOW }
}

function meal(participantIds: string[], overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal',
    title: 'Bữa',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds,
    hostMemberId: participantIds[0],
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function session(id: string, participantIds: string[]): SessionKeo {
  return { id, mealId: 'meal', name: `Kèo ${id}`, orderIndex: 0, participantIds, createdAt: NOW }
}

function invoice(overrides: Partial<Invoice> & Pick<Invoice, 'id' | 'sessionId' | 'payerMemberId' | 'totalAmount'>): Invoice {
  return {
    mealId: 'meal',
    inputMode: 'TOTAL_ONLY',
    splitType: 'EQUAL_TOTAL',
    equalSplitParticipantIds: [],
    subtotalAmount: overrides.totalAmount,
    discountMode: 'NONE',
    discountValue: 0,
    discountAmount: 0,
    serviceMode: 'NONE',
    serviceValue: 0,
    serviceAmount: 0,
    vatMode: 'NONE',
    vatValue: 0,
    vatAmount: 0,
    fileIds: [],
    createdAt: NOW,
    ...overrides,
  }
}

function item(overrides: Partial<InvoiceItem> & Pick<InvoiceItem, 'id' | 'invoiceId' | 'sessionId' | 'finalAmount'>): InvoiceItem {
  return {
    mealId: 'meal',
    name: overrides.id,
    quantity: 1,
    unitPrice: overrides.finalAmount,
    rawAmount: overrides.finalAmount,
    allocatedDiscountAmount: 0,
    allocatedServiceAmount: 0,
    allocatedVatAmount: 0,
    consumers: [],
    ...overrides,
  }
}

const sumOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

describe('computeMealSettlement — chi phí & làm tròn (R-1, R-3)', () => {
  it('chia đều 3 người không lệch đồng: Σ Owed = Σ đã chi (AC-1)', () => {
    const ids = ['a', 'b', 'c']
    const result = computeMealSettlement({
      meal: meal(ids),
      members: ids.map((id) => member(id)),
      sessions: [session('s1', ids)],
      invoices: [invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'a', totalAmount: 100_000, equalSplitParticipantIds: ids })],
      items: [],
    })
    expect(sumOf(result.memberBreakdowns.map((m) => m.totalOwed))).toBe(100_000)
    expect(sumOf(result.entities.map((e) => e.totalPaid))).toBe(100_000)
    expect(sumOf(result.entities.map((e) => e.netBalance))).toBe(0)
    // Người đầu tiên nhận phần lệch 1đ theo thứ tự tham gia (R-3).
    expect(result.memberBreakdowns.map((m) => m.totalOwed)).toEqual([33_334, 33_333, 33_333])
  })

  it('chia lẻ cho 6 và 7 người vẫn khớp 100%', () => {
    for (const n of [6, 7]) {
      const ids = Array.from({ length: n }, (_, i) => `m${i}`)
      const result = computeMealSettlement({
        meal: meal(ids),
        members: ids.map((id) => member(id)),
        sessions: [session('s1', ids)],
        invoices: [invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'm0', totalAmount: 999_999, equalSplitParticipantIds: ids })],
        items: [],
      })
      expect(sumOf(result.memberBreakdowns.map((m) => m.totalOwed))).toBe(999_999)
    }
  })

  it('AC-5: người không thuộc kèo không bị tính tiền ở kèo đó', () => {
    const result = computeMealSettlement({
      meal: meal(['a', 'b', 'c']),
      members: ['a', 'b', 'c'].map((id) => member(id)),
      sessions: [session('s1', ['a', 'b']), session('s2', ['a', 'b', 'c'])],
      invoices: [
        invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'a', totalAmount: 60_000, equalSplitParticipantIds: ['a', 'b'] }),
        invoice({ id: 'i2', sessionId: 's2', payerMemberId: 'c', totalAmount: 90_000, equalSplitParticipantIds: ['a', 'b', 'c'] }),
      ],
      items: [],
    })
    const c = result.memberBreakdowns.find((m) => m.memberId === 'c')!
    expect(c.chargeLines.map((l) => l.invoiceId)).toEqual(['i2'])
    expect(c.totalOwed).toBe(30_000)
    expect(c.totalPaid).toBe(90_000)
  })

  it('BR-5.6/BR-5.7: chia món theo số phần, tiền khớp finalAmount', () => {
    const result = computeMealSettlement({
      meal: meal(['a', 'b']),
      members: ['a', 'b'].map((id) => member(id)),
      sessions: [session('s1', ['a', 'b'])],
      invoices: [invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'a', totalAmount: 100_000, inputMode: 'ITEMIZED', splitType: 'BY_ITEM' })],
      items: [
        item({ id: 'it1', invoiceId: 'i1', sessionId: 's1', finalAmount: 100_000, consumers: [{ memberId: 'a', shares: 3 }, { memberId: 'b', shares: 1 }] }),
      ],
    })
    const [a, b] = result.memberBreakdowns
    expect(a.totalOwed).toBe(75_000)
    expect(b.totalOwed).toBe(25_000)
    expect(result.isAllSettled).toBe(false) // còn người phải trả, chưa tick
  })

  it('R-2: món BY_ITEM chưa có người ăn được đưa vào unassignedAmount và chặn hoàn tất', () => {
    const result = computeMealSettlement({
      meal: meal(['a', 'b']),
      members: ['a', 'b'].map((id) => member(id)),
      sessions: [session('s1', ['a', 'b'])],
      invoices: [invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'a', totalAmount: 150_000, inputMode: 'ITEMIZED', splitType: 'BY_ITEM' })],
      items: [
        item({ id: 'it1', invoiceId: 'i1', sessionId: 's1', finalAmount: 100_000, consumers: [{ memberId: 'b', shares: 1 }] }),
        item({ id: 'it2', invoiceId: 'i1', sessionId: 's1', finalAmount: 50_000 }),
      ],
    })
    expect(result.unassignedAmount).toBe(50_000)
    expect(result.unassignedItemCount).toBe(1)
    expect(result.assignedAmount).toBe(100_000)
    expect(sumOf(result.memberBreakdowns.map((m) => m.totalOwed))).toBe(100_000)
    expect(result.isAllSettled).toBe(false)
  })
})

describe('computeMealSettlement — gom nhóm & trạng thái (R-4, R-7)', () => {
  it('BR-6.3: nhóm cặp đôi gộp Paid và Owed thành một thực thể', () => {
    const ids = ['h', 'x', 'y']
    const result = computeMealSettlement({
      meal: meal(ids, { paymentGroups: [{ id: 'g1', mealId: 'meal', name: 'Cặp đôi X - Y', memberIds: ['x', 'y'] }] }),
      members: ids.map((id) => member(id)),
      sessions: [session('s1', ids)],
      invoices: [
        invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'x', totalAmount: 90_000, equalSplitParticipantIds: ids }),
        invoice({ id: 'i2', sessionId: 's1', payerMemberId: 'h', totalAmount: 30_000, equalSplitParticipantIds: ids }),
      ],
      items: [],
    })
    expect(result.entities.map((e) => e.entityId)).toEqual(['g1', 'h'])
    const pair = result.entities[0]
    expect(pair.isGroup).toBe(true)
    expect(pair.totalPaid).toBe(90_000)
    // i1: 90 000 chia 3 → 30 000/người; i2: 30 000 chia 3 → 10 000/người. Cặp đôi = 2 × (30 000 + 10 000).
    expect(pair.totalOwed).toBe(80_000)
    expect(pair.netBalance).toBe(10_000)
    expect(result.entities[1].netBalance).toBe(-10_000)
  })

  it('AC-4: tiến độ đếm theo khoản chuyển tiền; chỉ người phải chuyển mới cần tick', () => {
    const ids = ['a', 'b']
    const base = {
      members: ids.map((id) => member(id)),
      sessions: [session('s1', ids)],
      invoices: [invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'a', totalAmount: 80_000, equalSplitParticipantIds: ids })],
      items: [],
    }
    const open = computeMealSettlement({ ...base, meal: meal(ids) })
    expect(open.entities.find((e) => e.entityId === 'a')!.isPaid).toBe(false)
    expect(open.transferCount).toBe(1)
    expect(open.paidTransferCount).toBe(0)
    expect(open.isAllSettled).toBe(false)

    const ticked = computeMealSettlement({
      ...base,
      meal: meal(ids, { settlementStatuses: { 'b->a': { isPaid: true, paidAt: NOW, amount: 40_000 } } }),
    })
    expect(ticked.paidTransferCount).toBe(1)
    expect(ticked.transfers[0].isPaid).toBe(true)
    expect(ticked.entities.every((e) => e.isPaid)).toBe(true)
    expect(ticked.isAllSettled).toBe(true)

    // tick cũ mất hiệu lực khi số tiền của khoản chuyển đã đổi
    const stale = computeMealSettlement({
      ...base,
      meal: meal(ids, { settlementStatuses: { 'b->a': { isPaid: true, amount: 1 } } }),
    })
    expect(stale.paidTransferCount).toBe(0)
  })

  it('nhờ chủ trì thu: không có khoản từ chủ trì cho chính chủ trì và chủ trì không phải tick', () => {
    const ids = ['a', 'b', 'c']
    const base = {
      members: ids.map((id) => member(id)),
      sessions: [session('s1', ids)],
      invoices: [
        invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'a', totalAmount: 90_000, equalSplitParticipantIds: ids }),
        invoice({ id: 'i2', sessionId: 's1', payerMemberId: 'b', totalAmount: 60_000, equalSplitParticipantIds: ids }),
      ],
      items: [],
    }
    const result = computeMealSettlement({ ...base, meal: meal(ids, { settlementMode: 'HOST_MEDIATED', hostMemberId: 'a' }) })
    expect(result.transfers.every((t) => t.fromEntityId !== t.toEntityId)).toBe(true)
    expect(result.transfers.map((t) => `${t.fromEntityId}>${t.toEntityId}`)).toEqual(['a>b', 'c>a'])
    expect(result.transferCount).toBe(2)

    // Nhóm chứa chủ trì: nhóm đó không chuyển cho chính mình, không phải tick.
    const grouped = computeMealSettlement({
      ...base,
      meal: meal(ids, {
        settlementMode: 'HOST_MEDIATED',
        hostMemberId: 'a',
        paymentGroups: [{ id: 'g', mealId: 'm', name: 'A+B', memberIds: ['a', 'b'] }],
      }),
    })
    expect(grouped.transfers.map((t) => `${t.fromEntityId}>${t.toEntityId}`)).toEqual(['c>g'])
  })
})

describe('computeSelfSettlementTransfers & computeHostMediatedTransfers (R-5, R-6)', () => {
  it('R-5: ghép tham lam, tổng chuyển khớp tổng dư dương, số giao dịch tối thiểu cho ví dụ đơn giản', () => {
    const entities = [
      { entityId: 'a', entityName: 'A', netBalance: -70_000 },
      { entityId: 'b', entityName: 'B', netBalance: -30_000 },
      { entityId: 'c', entityName: 'C', netBalance: 60_000 },
      { entityId: 'd', entityName: 'D', netBalance: 40_000 },
    ]
    const transfers = computeSelfSettlementTransfers(entities)
    expect(sumOf(transfers.map((t) => t.amount))).toBe(100_000)
    expect(transfers).toEqual([
      { fromEntityId: 'a', fromEntityName: 'A', toEntityId: 'c', toEntityName: 'C', amount: 60_000 },
      { fromEntityId: 'a', fromEntityName: 'A', toEntityId: 'd', toEntityName: 'D', amount: 10_000 },
      { fromEntityId: 'b', fromEntityName: 'B', toEntityId: 'd', toEntityName: 'D', amount: 30_000 },
    ])
  })

  it('R-6: chủ trì đứng lẻ: con nợ chuyển cho chủ trì, chủ trì hoàn cho người dư', () => {
    const entities = [
      { entityId: 'h', entityName: 'Tôi', netBalance: 20_000 },
      { entityId: 'a', entityName: 'A', netBalance: -50_000 },
      { entityId: 'b', entityName: 'B', netBalance: 30_000 },
    ]
    const transfers = computeHostMediatedTransfers(entities, 'h')
    expect(transfers).toEqual([
      { fromEntityId: 'a', fromEntityName: 'A', toEntityId: 'h', toEntityName: 'Tôi', amount: 50_000 },
      { fromEntityId: 'h', fromEntityName: 'Tôi', toEntityId: 'b', toEntityName: 'B', amount: 30_000 },
    ])
  })

  it('R-6: chủ trì thuộc một nhóm thanh toán dùng nhóm làm đầu mối', () => {
    const ids = ['h', 'w', 'a']
    const result = computeMealSettlement({
      meal: meal(ids, {
        settlementMode: 'HOST_MEDIATED',
        paymentGroups: [{ id: 'g', mealId: 'meal', name: 'Vợ chồng', memberIds: ['h', 'w'] }],
      }),
      members: ids.map((id) => member(id)),
      sessions: [session('s1', ids)],
      invoices: [invoice({ id: 'i1', sessionId: 's1', payerMemberId: 'a', totalAmount: 90_000, equalSplitParticipantIds: ids })],
      items: [],
    })
    // i1: 90 000 chia 3 → 30 000/người. Nhóm (h, w) nợ 60 000; a ứng dư 60 000.
    expect(result.hostEntityId).toBe('g')
    expect(result.transfers).toEqual([
      { fromEntityId: 'g', fromEntityName: 'Vợ chồng', toEntityId: 'a', toEntityName: 'a', amount: 60_000, key: 'g->a', isPaid: false },
    ])
  })
})
