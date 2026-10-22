import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import { createInvoice, setItemConsumers, updateInvoice } from './invoiceService'
import { addSession, setSessionParticipants } from './sessionService'
import { initMealPeople } from './mealPeopleService'
import { archiveMeal, getArchivePreview } from './archiveService'
import { payAllTransfers } from './settlementTestUtils'
import { toggleTransferPaid } from './settlementService'
import { renameSession } from './sessionService'
import { PeopleError } from './peopleErrors'
import type { Meal } from '../types'

const none = { mode: 'NONE' as const, value: 0 }

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

async function makeMeal(participants: string[]): Promise<Meal> {
  const init = await initMealPeople()
  const now = new Date().toISOString()
  const meal: Meal = {
    id: crypto.randomUUID(), title: 'Lẩu', date: '2026-10-19', status: 'ACTIVE',
    participantIds: participants, hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: now, updatedAt: now,
  }
  await db.meals.put(meal)
  return meal
}

async function addMember(id: string, name: string): Promise<string> {
  const now = new Date().toISOString()
  await db.members.put({ id, name, normalizedName: name.toLowerCase(), avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
  return id
}

/** Bữa hai người: chủ app trả 90 000 chia đều, rồi tick đủ thanh toán. */
async function settledMeal() {
  const init = await initMealPeople()
  const bob = await addMember('bob', 'Bình')
  const meal = await makeMeal([init.hostMemberId, bob])
  const session = await addSession(meal.id, 'Kèo 1')
  const { invoice } = await createInvoice({
    sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'TOTAL_ONLY', items: [],
    subtotalAmount: 90_000, discount: none, service: none, vat: none,
  })
  await payAllTransfers(meal.id)
  return { meal, session, invoice, host: init.hostMemberId, bob }
}

describe('archiveService (Epic 7: BR-7.1 → BR-7.3, R-1 → R-5)', () => {
  it('chặn lưu trữ khi còn người chưa thanh toán và báo đúng tên', async () => {
    const init = await initMealPeople()
    const bob = await addMember('bob', 'Bình')
    const meal = await makeMeal([init.hostMemberId, bob])
    const session = await addSession(meal.id, 'Kèo 1')
    await createInvoice({ sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'TOTAL_ONLY', items: [], subtotalAmount: 90_000, discount: none, service: none, vat: none })

    const err = await archiveMeal(meal.id).catch((e) => e)
    expect(err).toBeInstanceOf(PeopleError)
    expect(err.code).toBe('ARCHIVE_UNPAID_ENTITIES')
    expect(err.detail.unpaidEntityNames).toContain('Bình → Tôi')
    expect((await db.meals.get(meal.id))!.status).toBe('ACTIVE')
  })

  it('chặn lưu trữ khi còn món chưa có người ăn', async () => {
    const init = await initMealPeople()
    const meal = await makeMeal([init.hostMemberId])
    const session = await addSession(meal.id, 'Kèo 1')
    const { items } = await createInvoice({
      sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'ITEMIZED', splitType: 'BY_ITEM',
      items: [{ name: 'Bia', quantity: 1, unitPrice: 50_000 }], discount: none, service: none, vat: none,
    })
    await setItemConsumers(items[0].id, [])
    await expect(archiveMeal(meal.id)).rejects.toMatchObject({ code: 'ARCHIVE_UNASSIGNED_ITEMS' })
  })

  it('chặn lưu trữ bữa chưa có chi phí', async () => {
    const init = await initMealPeople()
    const meal = await makeMeal([init.hostMemberId])
    await addSession(meal.id, 'Kèo 1')
    await expect(archiveMeal(meal.id)).rejects.toMatchObject({ code: 'ARCHIVE_EMPTY_MEAL' })
  })

  it('lưu trữ thành công: xoá hoá đơn và ảnh, giữ món và kèo đã chốt, khoá mọi thao tác', async () => {
    const f = await settledMeal()
    const preview = await getArchivePreview(f.meal.id)
    expect(preview.invoiceCount).toBe(1)
    await db.items.add({
      id: 'kept-item', mealId: f.meal.id, sessionId: f.session.id, invoiceId: f.invoice.id, name: 'Lẩu', quantity: 1, unitPrice: 90_000,
      rawAmount: 90_000, allocatedDiscountAmount: 0, allocatedServiceAmount: 0, allocatedVatAmount: 0, finalAmount: 90_000, consumers: [],
    })

    await archiveMeal(f.meal.id, new Date('2026-10-19T12:00:00.000Z'))

    const archived = (await db.meals.get(f.meal.id))!
    expect(archived.status).toBe('ARCHIVED')
    expect(archived.archivedAt).toBe('2026-10-19T12:00:00.000Z')
    expect(archived.archivedSummary!.totalMealAmount).toBe(90_000)
    expect(archived.archivedSummary!.entitiesSummary.every((e) => e.isPaid)).toBe(true)

    expect(await db.invoices.where('mealId').equals(f.meal.id).count()).toBe(0)
    expect((await db.items.where('mealId').equals(f.meal.id).toArray()).map((i) => i.id)).toEqual(['kept-item'])
    expect(await db.invoice_files.where('mealId').equals(f.meal.id).count()).toBe(0)

    const kept = (await db.sessions.get(f.session.id))!
    expect(kept.archivedTotalAmount).toBe(90_000)
    expect(kept.archivedPayerSummary).toEqual([{ memberId: f.host, paidAmount: 90_000 }])
  })

  it('BR-7.3 & R-5: bữa đã lưu trữ không thể bị sửa qua các service', async () => {
    const f = await settledMeal()
    await archiveMeal(f.meal.id)
    await expect(renameSession(f.session.id, 'Đổi tên')).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(setSessionParticipants(f.session.id, [f.host])).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(toggleTransferPaid(f.meal.id, 'x->y', false)).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(archiveMeal(f.meal.id)).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
  })

  it('xoá vĩnh viễn bữa đã lưu trữ vẫn hoạt động (US-7.4)', async () => {
    const { deleteMeal } = await import('./mealService')
    const f = await settledMeal()
    await archiveMeal(f.meal.id)
    await deleteMeal(f.meal.id)
    expect(await db.meals.get(f.meal.id)).toBeUndefined()
    expect(await db.sessions.where('mealId').equals(f.meal.id).count()).toBe(0)
  })

  it('giữ nguyên các bữa khác khi lưu trữ một bữa', async () => {
    const other = await settledMeal()
    const target = await settledMeal()
    await archiveMeal(target.meal.id)
    expect((await db.meals.get(other.meal.id))!.status).toBe('ACTIVE')
    expect(await db.invoices.where('mealId').equals(other.meal.id).count()).toBe(1)
  })

  it('sửa hoá đơn làm đổi số tiền chuyển thì tick cũ mất hiệu lực; tick lại rồi lưu trữ dùng tổng mới (B.8 rủi ro 3)', async () => {
    const f = await settledMeal()
    await updateInvoice(f.invoice.id, {
      sessionId: f.session.id, payerMemberId: f.host, inputMode: 'TOTAL_ONLY', items: [],
      subtotalAmount: 120_000, discount: none, service: none, vat: none,
    })
    await expect(archiveMeal(f.meal.id)).rejects.toMatchObject({ code: 'ARCHIVE_UNPAID_ENTITIES' })
    await payAllTransfers(f.meal.id)
    await archiveMeal(f.meal.id)
    expect((await db.meals.get(f.meal.id))!.archivedSummary!.totalMealAmount).toBe(120_000)
  })

  it('getArchivePreview đếm hoá đơn và file trước khi lưu trữ', async () => {
    const init = await initMealPeople()
    const meal = await makeMeal([init.hostMemberId])
    const session = await addSession(meal.id, 'Kèo 1')
    const { items } = await createInvoice({
      sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'ITEMIZED', splitType: 'EQUAL_TOTAL',
      items: [{ name: 'Bia', quantity: 1, unitPrice: 50_000 }, { name: 'Trà', quantity: 1, unitPrice: 10_000 }],
      discount: none, service: none, vat: none,
    })
    expect(items).toHaveLength(2)
    expect(await getArchivePreview(meal.id)).toEqual({ invoiceCount: 1, fileCount: 0, totalFileBytes: 0 })
  })
})
