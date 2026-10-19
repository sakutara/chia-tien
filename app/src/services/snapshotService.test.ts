import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import { decodeSnapshotPayload, hydrateSnapshotForSettlement } from '../domain/shareSnapshot'
import { computeMealSettlement } from '../domain/settlementEngine'
import { createInvoice } from './invoiceService'
import { initMealPeople } from './mealPeopleService'
import { archiveMeal } from './archiveService'
import { addSession } from './sessionService'
import { loadMealSnapshotPayload, scopeSnapshot } from './snapshotService'
import { payAllTransfers } from './settlementTestUtils'
import { createMeal } from './mealService'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

const none = { mode: 'NONE' as const, value: 0 }

async function settledMeal() {
  const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
  const init = await initMealPeople()
  const now = new Date().toISOString()
  await db.members.put({ id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
  await db.meals.update(meal.id, { participantIds: [init.hostMemberId, 'bob'] })
  const session = await addSession(meal.id, 'Kèo 1')
  await createInvoice({
    sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'TOTAL_ONLY', items: [],
    subtotalAmount: 90_000, discount: none, service: none, vat: none,
  })
  await payAllTransfers(meal.id)
  return meal.id
}

describe('Snapshot chỉ chứa khoản chuyển của người được chọn', () => {
  const bank = (n: string) => ({ bankBin: '970436', bankName: 'Vietcombank', accountName: n, accountNumber: '0123456789' })

  /** Chủ app trả 120 000 chia 3 (An=chủ app, Bình, Cường): Bình và Cường mỗi người chuyển 40 000 cho chủ app. */
  async function threePeople() {
    const init = await initMealPeople()
    const now = new Date().toISOString()
    for (const [id, name] of [['bob', 'Bình'], ['cuong', 'Cường']]) {
      await db.members.put({ id, name, normalizedName: id, avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
    }
    const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
    await db.meals.update(meal.id, { participantIds: [init.hostMemberId, 'bob', 'cuong'] })
    const session = await addSession(meal.id, 'Kèo 1')
    await createInvoice({ sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'TOTAL_ONLY', items: [], subtotalAmount: 120_000, discount: none, service: none, vat: none })
    await db.members.update(init.hostMemberId, { bank: bank('CHU TRI') })
    await db.members.update('bob', { bank: bank('BINH') })
    await db.members.update('cuong', { bank: bank('CUONG') })
    await payAllTransfers(meal.id, false)
    return { mealId: meal.id, host: init.hostMemberId }
  }

  it('mặc định chứa mọi khoản chuyển và chỉ tài khoản người nhận (chủ trì)', async () => {
    const f = await threePeople()
    const decoded = decodeSnapshotPayload((await loadMealSnapshotPayload(f.mealId)).encoded)
    expect(decoded.payments?.map((p) => p.fromName).sort()).toEqual(['Bình', 'Cường'])
    expect(decoded.payments?.every((p) => p.bank?.accountName === 'CHU TRI')).toBe(true)
    expect(decoded.members.every((m) => m.bank === undefined)).toBe(true)
  })

  it('chọn một người: snapshot không chứa khoản, số dư hay tài khoản của người còn lại', async () => {
    const f = await threePeople()
    const loaded = await loadMealSnapshotPayload(f.mealId)
    const scoped = scopeSnapshot(loaded.data, ['bob'])
    const decoded = decodeSnapshotPayload(scoped.encoded)

    expect(decoded.payments).toHaveLength(1)
    expect(decoded.payments?.[0]).toMatchObject({ fromName: 'Bình', amount: 40_000 })
    const json = JSON.stringify(decoded.payments)
    expect(json).not.toContain('Cường')
    expect(json).not.toContain('CUONG')
    expect(json).not.toContain('BINH') // tài khoản người chuyển không cần thiết
    expect(decoded.members.every((m) => m.bank === undefined)).toBe(true)
    expect(Object.keys(decoded.settlementStatuses)).toEqual([])
  })

  it('bữa đã lưu trữ: snapshot theo người được chọn không mang bảng số dư của mọi người', async () => {
    const f = await threePeople()
    await payAllTransfers(f.mealId)
    await archiveMeal(f.mealId)
    const loaded = await loadMealSnapshotPayload(f.mealId)
    expect(loaded.payload.archivedSummary?.entitiesSummary).toEqual([])
    expect(loaded.payload.archivedSummary?.transfers).toEqual([])
    expect(loaded.payload.payments).toBeDefined()
  })
})

describe('loadMealSnapshotPayload (US-8.1, BR-8.1)', () => {
  it('tạo snapshot từ bữa đang hoạt động, giải mã lại được và khớp quyết toán', async () => {
    const mealId = await settledMeal()
    const loaded = await loadMealSnapshotPayload(mealId, new Date('2026-10-19T12:00:00.000Z'))
    expect(loaded.snapshotUrl).toContain('?s=')

    // Link gọn chỉ mang khoản chuyển tiền; payload đầy đủ vẫn khớp quyết toán.
    const decoded = decodeSnapshotPayload(loaded.encoded)
    expect(decoded.meal.title).toBe('Lẩu')
    expect(decoded.sessions).toEqual([])
    expect(decoded.payments).toHaveLength(loaded.payload.payments!.length)
    expect(loaded.payload.sessions[0].invoices[0].totalAmount).toBe(90_000)

    const rebuilt = computeMealSettlement(hydrateSnapshotForSettlement(loaded.payload))
    expect(rebuilt.totalMealAmount).toBe(loaded.settlement.totalMealAmount)
    expect(rebuilt.isAllSettled).toBe(loaded.settlement.isAllSettled)
  })

  it('tạo snapshot cho bữa đã lưu trữ dựa trên archivedSummary', async () => {
    const mealId = await settledMeal()
    await archiveMeal(mealId)
    const loaded = await loadMealSnapshotPayload(mealId)
    const decoded = loaded.payload
    expect(decoded.meal.status).toBe('ARCHIVED')
    expect(decoded.archivedSummary!.totalMealAmount).toBe(90_000)
    expect(decoded.sessions[0].invoices).toEqual([])
  })

  it('báo lỗi khi bữa không tồn tại', async () => {
    await expect(loadMealSnapshotPayload('không-có')).rejects.toMatchObject({ code: 'MEAL_NOT_FOUND' })
  })
})
