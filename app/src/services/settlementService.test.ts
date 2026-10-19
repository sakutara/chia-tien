import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import { createMeal } from './mealService'
import { createInvoice } from './invoiceService'
import { initMealPeople } from './mealPeopleService'
import { addSession } from './sessionService'
import { setSettlementMode, setTransfersPaid, toggleTransferPaid } from './settlementService'
import { payAllTransfers } from './settlementTestUtils'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

describe('settlementService (Epic 6: BR-6.5, BR-6.7, R-7, R-8)', () => {
  it('đổi chế độ quyết toán và lưu vào bữa', async () => {
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    const updated = await setSettlementMode(meal.id, 'HOST_MEDIATED')
    expect(updated.settlementMode).toBe('HOST_MEDIATED')
    expect((await db.meals.get(meal.id))!.settlementMode).toBe('HOST_MEDIATED')
    await expect(setSettlementMode(meal.id, 'XYZ' as never)).rejects.toMatchObject({ code: 'INVALID_SETTLEMENT_MODE' })
  })

  /** Bữa 2 người: chủ app trả 90 000 chia đều → một khoản chuyển Bình → chủ app 45 000. */
  async function oneTransferMeal() {
    const init = await initMealPeople()
    const now = new Date().toISOString()
    await db.members.put({ id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    await db.meals.update(meal.id, { participantIds: [init.hostMemberId, 'bob'] })
    const session = await addSession(meal.id, 'Kèo 1')
    const none = { mode: 'NONE' as const, value: 0 }
    await createInvoice({ sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'TOTAL_ONLY', items: [], subtotalAmount: 90_000, discount: none, service: none, vat: none })
    return { mealId: meal.id, host: init.hostMemberId, key: `bob->${init.hostMemberId}` }
  }

  it('tick và bỏ tick từng khoản chuyển, ghi paidAt và số tiền lúc tick', async () => {
    const f = await oneTransferMeal()
    const now = new Date('2026-10-19T12:00:00.000Z')
    const ticked = await toggleTransferPaid(f.mealId, f.key, true, now)
    expect(ticked.settlementStatuses[f.key]).toEqual({ isPaid: true, paidAt: now.toISOString(), amount: 45_000 })
    const unticked = await toggleTransferPaid(f.mealId, f.key, false, now)
    expect(unticked.settlementStatuses[f.key]).toBeUndefined()
  })

  it('từ chối khoản chuyển không tồn tại', async () => {
    const f = await oneTransferMeal()
    await expect(toggleTransferPaid(f.mealId, 'ghost->nobody', true)).rejects.toMatchObject({ code: 'TRANSFER_NOT_FOUND' })
  })

  it('tick hàng loạt mọi khoản chuyển', async () => {
    const f = await oneTransferMeal()
    const updated = await payAllTransfers(f.mealId)
    expect(Object.keys(updated.settlementStatuses)).toEqual([f.key])
    await setTransfersPaid(f.mealId, [f.key], false)
    expect((await db.meals.get(f.mealId))!.settlementStatuses).toEqual({})
  })

  it('bữa ARCHIVED bị khoá mọi thao tác quyết toán', async () => {
    const meal = await createMeal({ title: 'Bữa', date: '2026-10-19' })
    await db.meals.update(meal.id, { status: 'ARCHIVED' })
    await expect(setSettlementMode(meal.id, 'HOST_MEDIATED')).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(toggleTransferPaid(meal.id, 'a->b', true)).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
  })
})
