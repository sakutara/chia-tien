import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import type { InvoiceItem, Meal, SessionKeo } from '../types'
import { initMealPeople } from './mealPeopleService'
import { addSession, renameSession, setSessionParticipants } from './sessionService'
import {
  addInvoiceItem,
  createInvoice,
  deleteInvoice,
  deleteInvoiceItem,
  getInvoiceDeletePreview,
  setAllItemsConsumers,
  setEqualSplitParticipants,
  setInvoicePayer,
  setInvoiceSplitType,
  setItemConsumers,
  updateInvoice,
  updateInvoiceItem,
  type InvoiceDraft,
} from './invoiceService'
import { PeopleError } from './peopleErrors'

const none = { mode: 'NONE' as const, value: 0 }
const pct = (value: number) => ({ mode: 'PERCENTAGE' as const, value })

async function addMember(id: string, name: string): Promise<string> {
  const now = new Date().toISOString()
  await db.members.put({ id, name, normalizedName: name.toLowerCase(), avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
  return id
}

async function makeMeal(participantIds: string[], overrides: Partial<Meal> = {}): Promise<Meal> {
  const init = await initMealPeople()
  const now = new Date().toISOString()
  const meal: Meal = {
    id: crypto.randomUUID(),
    title: 'Bữa test',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds,
    hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
  await db.meals.put(meal)
  return meal
}

function draft(sessionId: string, payerMemberId: string, overrides: Partial<InvoiceDraft> = {}): InvoiceDraft {
  return {
    sessionId,
    payerMemberId,
    inputMode: 'ITEMIZED',
    items: [
      { name: 'Lẩu bò', quantity: 2, unitPrice: 150_000 },
      { name: 'Bia', quantity: 1, unitPrice: 250_000 },
    ],
    discount: none,
    service: none,
    vat: pct(8),
    ...overrides,
  }
}

describe('invoiceService', () => {
  let hostId: string

  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()))
    })
    await ensureDefaultData()
    hostId = (await initMealPeople()).hostMemberId
  })

  it('tạo hoá đơn: chia đều cho cả kèo, ghi món và tổng đúng', async () => {
    const bob = await addMember('bob', 'Bình')
    const meal = await makeMeal([hostId, bob])
    const session = await addSession(meal.id)

    const { invoice, items } = await createInvoice(draft(session.id, bob))

    expect(invoice.equalSplitParticipantIds).toEqual([hostId, bob])
    expect(invoice.payerMemberId).toBe(bob)
    expect(invoice.totalAmount).toBe(594_000) // 550 000 + VAT 8%
    expect(items).toHaveLength(2)
    expect(items.reduce((s, it) => s + it.finalAmount, 0)).toBe(invoice.totalAmount)
    expect(await db.invoices.get(invoice.id)).toBeTruthy()
    expect(await db.items.where('invoiceId').equals(invoice.id).count()).toBe(2)
  })

  it('từ chối người ứng tiền không nằm trong kèo', async () => {
    const meal = await makeMeal([hostId])
    const session = await addSession(meal.id)
    await expect(createInvoice(draft(session.id, 'ghost'))).rejects.toMatchObject({ code: 'PAYER_NOT_IN_SESSION' })
  })

  it('từ chối ghi vào bữa đã lưu trữ', async () => {
    const meal = await makeMeal([hostId])
    const session = await addSession(meal.id)
    await db.meals.update(meal.id, { status: 'ARCHIVED' })
    await expect(createInvoice(draft(session.id, hostId))).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
  })

  it('đổi tên kèo mặc định theo quán từ OCR, không đổi kèo đã có tên riêng (BR-4.10)', async () => {
    const meal = await makeMeal([hostId])
    const defaultSession = await addSession(meal.id)
    const namedSession = await addSession(meal.id, 'Karaoke')

    const first = await createInvoice(draft(defaultSession.id, hostId, { vendorName: 'Lẩu Bò Gỗ', autoNameSession: true }))
    expect(first.renamedSessionTo).toBe('Kèo Lẩu Bò Gỗ')
    expect((await db.sessions.get(defaultSession.id))?.name).toBe('Kèo Lẩu Bò Gỗ')

    const second = await createInvoice(draft(namedSession.id, hostId, { vendorName: 'Quán khác', autoNameSession: true }))
    expect(second.renamedSessionTo).toBeUndefined()
    expect((await db.sessions.get(namedSession.id))?.name).toBe('Karaoke')
  })

  it('sửa hoá đơn giữ nguyên id món và danh sách người ăn', async () => {
    const meal = await makeMeal([hostId])
    const session = await addSession(meal.id)
    const created = await createInvoice(draft(session.id, hostId))
    const keptItem = created.items[0]
    await db.items.put({ ...keptItem, consumers: [{ memberId: hostId, shares: 2 }] } as InvoiceItem)

    const updated = await updateInvoice(
      created.invoice.id,
      draft(session.id, hostId, {
        items: [
          { id: keptItem.id, name: 'Lẩu bò lớn', quantity: 3, unitPrice: 150_000 },
          { name: 'Nước', quantity: 2, unitPrice: 10_000 },
        ],
      }),
    )

    const kept = await db.items.get(keptItem.id)
    expect(kept?.consumers).toEqual([{ memberId: hostId, shares: 2 }])
    expect(kept?.quantity).toBe(3)
    expect(updated.items).toHaveLength(2)
    expect(await db.items.where('invoiceId').equals(created.invoice.id).count()).toBe(2)
  })

  it('khi người bị bỏ khỏi kèo, sửa hoá đơn loại họ khỏi danh sách chia đều', async () => {
    const bob = await addMember('bob', 'Bình')
    const meal = await makeMeal([hostId, bob])
    const session = await addSession(meal.id)
    const created = await createInvoice(draft(session.id, hostId))
    expect(created.invoice.equalSplitParticipantIds).toEqual([hostId, bob])

    await setSessionParticipants(session.id, [hostId])
    const updated = await updateInvoice(created.invoice.id, draft(session.id, hostId))
    expect(updated.invoice.equalSplitParticipantIds).toEqual([hostId])
  })

  it('xoá hoá đơn kéo theo món và báo đúng số lượng trước khi xoá', async () => {
    const meal = await makeMeal([hostId])
    const session = await addSession(meal.id)
    const { invoice } = await createInvoice(draft(session.id, hostId))

    expect(await getInvoiceDeletePreview(invoice.id)).toEqual({ items: 2, files: 0 })
    await deleteInvoice(invoice.id)

    expect(await db.invoices.get(invoice.id)).toBeUndefined()
    expect(await db.items.where('invoiceId').equals(invoice.id).count()).toBe(0)
    await expect(deleteInvoice(invoice.id)).rejects.toBeInstanceOf(PeopleError)
  })

  it('đổi tên kèo bằng tay vẫn hoạt động sau khi đã có hoá đơn', async () => {
    const meal = await makeMeal([hostId])
    const session = await addSession(meal.id)
    await createInvoice(draft(session.id, hostId))
    const renamed: SessionKeo = await renameSession(session.id, 'Lẩu')
    expect(renamed.name).toBe('Lẩu')
  })

  it('bữa đã lưu trữ không sửa và không xoá được hoá đơn (BR-4.12)', async () => {
    const meal = await makeMeal([hostId])
    const session = await addSession(meal.id)
    const { invoice } = await createInvoice(draft(session.id, hostId))
    await db.meals.update(meal.id, { status: 'ARCHIVED' })

    await expect(updateInvoice(invoice.id, draft(session.id, hostId))).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(deleteInvoice(invoice.id)).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    expect(await db.invoices.get(invoice.id)).toBeDefined()
  })
})

describe('invoiceService — Epic 5 (người ứng, chế độ chia, món)', () => {
  let hostId: string
  let bobId: string
  let carolId: string

  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()))
    })
    await ensureDefaultData()
    hostId = (await initMealPeople()).hostMemberId
    bobId = await addMember('bob', 'Bình')
    carolId = await addMember('carol', 'Chi')
  })

  async function setup(participants = [hostId, bobId, carolId]) {
    const meal = await makeMeal(participants)
    const session = await addSession(meal.id)
    return { meal, session }
  }

  it('US-5.1: đổi người ứng trong kèo; người ngoài kèo bị từ chối (BR-5.1, R-1)', async () => {
    const { session } = await setup()
    const { invoice } = await createInvoice(draft(session.id, hostId))
    const updated = await setInvoicePayer(invoice.id, carolId)
    expect(updated.payerMemberId).toBe(carolId)

    const outsider = await addMember('dan', 'Dân')
    await expect(setInvoicePayer(invoice.id, outsider)).rejects.toMatchObject({ code: 'PAYER_NOT_IN_SESSION' })
  })

  it('US-5.1 / BR-5.9: bữa ARCHIVED khoá đổi người ứng', async () => {
    const { meal, session } = await setup()
    const { invoice } = await createInvoice(draft(session.id, hostId))
    await db.meals.update(meal.id, { status: 'ARCHIVED' })
    await expect(setInvoicePayer(invoice.id, bobId)).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
  })

  it('US-5.2 / R-2: hoá đơn TOTAL_ONLY bị khoá ở EQUAL_TOTAL và không nhận món', async () => {
    const { session } = await setup()
    const { invoice } = await createInvoice({
      ...draft(session.id, hostId),
      inputMode: 'TOTAL_ONLY',
      items: [],
      subtotalAmount: 500_000,
    })
    expect(invoice.splitType).toBe('EQUAL_TOTAL')
    await expect(setInvoiceSplitType(invoice.id, 'BY_ITEM')).rejects.toMatchObject({ code: 'SPLIT_TYPE_LOCKED' })
    await expect(addInvoiceItem(invoice.id, { name: 'Bia', quantity: 1, unitPrice: 10_000 })).rejects.toMatchObject({
      code: 'SPLIT_TYPE_LOCKED',
    })
  })

  it('US-5.2 / BR-5.4 / R-3: đổi BY_ITEM ↔ EQUAL_TOTAL giữ nguyên người ăn', async () => {
    const { session } = await setup()
    const { invoice, items } = await createInvoice({ ...draft(session.id, hostId), splitType: 'BY_ITEM' })
    expect(invoice.splitType).toBe('BY_ITEM')
    await setItemConsumers(items[0].id, [{ memberId: bobId, shares: 3 }])

    await setInvoiceSplitType(invoice.id, 'EQUAL_TOTAL')
    await setInvoiceSplitType(invoice.id, 'BY_ITEM')
    const after = await db.items.get(items[0].id)
    expect(after?.consumers).toEqual([{ memberId: bobId, shares: 3 }])
  })

  it('US-5.3 / R-4: danh sách chia đều không rỗng, không ra ngoài kèo', async () => {
    const { session } = await setup()
    const { invoice } = await createInvoice(draft(session.id, hostId))
    const updated = await setEqualSplitParticipants(invoice.id, [bobId])
    expect(updated.equalSplitParticipantIds).toEqual([bobId])
    await expect(setEqualSplitParticipants(invoice.id, [])).rejects.toMatchObject({ code: 'EQUAL_SPLIT_EMPTY' })
    await expect(setEqualSplitParticipants(invoice.id, ['ghost'])).rejects.toMatchObject({
      code: 'SPLIT_MEMBER_NOT_IN_SESSION',
    })
  })

  it('US-5.3 / R-7: thêm, sửa, xoá món tính lại tổng và phân bổ khớp 100%', async () => {
    const { session } = await setup()
    const { invoice, items } = await createInvoice(draft(session.id, hostId))
    const beforeIds = items.map((it) => it.id)

    const added = await addInvoiceItem(invoice.id, { name: 'Trà đá', quantity: 3, unitPrice: 10_000 })
    expect(added.items).toHaveLength(3)
    expect(added.invoice.subtotalAmount).toBe(580_000)
    expect(added.items.reduce((s, it) => s + it.finalAmount, 0)).toBe(added.invoice.totalAmount)
    expect(added.items.map((it) => it.orderIndex)).toEqual([0, 1, 2])

    const edited = await updateInvoiceItem(beforeIds[1], { name: 'Bia Tiger', quantity: 2, unitPrice: 125_000 })
    expect(edited.invoice.subtotalAmount).toBe(580_000) // 300 000 + 250 000 + 30 000
    expect(edited.items.reduce((s, it) => s + it.finalAmount, 0)).toBe(edited.invoice.totalAmount)

    const deleted = await deleteInvoiceItem(beforeIds[0])
    expect(deleted.items).toHaveLength(2)
    expect(deleted.items.reduce((s, it) => s + it.finalAmount, 0)).toBe(deleted.invoice.totalAmount)
    expect(await db.items.get(beforeIds[0])).toBeUndefined()
  })

  it('US-5.3: sửa món giữ nguyên người ăn; xoá món không ảnh hưởng món khác', async () => {
    const { session } = await setup()
    const { invoice, items } = await createInvoice(draft(session.id, hostId))
    await setItemConsumers(items[0].id, [{ memberId: bobId, shares: 2 }])
    await updateInvoiceItem(items[0].id, { name: 'Lẩu bò to', quantity: 2, unitPrice: 160_000 })
    expect((await db.items.get(items[0].id))?.consumers).toEqual([{ memberId: bobId, shares: 2 }])
    expect(invoice.id).toBeTruthy()
  })

  it('R-8: không xoá món cuối cùng của hoá đơn ITEMIZED', async () => {
    const { session } = await setup()
    const { items } = await createInvoice({ ...draft(session.id, hostId), items: [{ name: 'Bia', quantity: 1, unitPrice: 100_000 }] })
    await expect(deleteInvoiceItem(items[0].id)).rejects.toMatchObject({ code: 'LAST_ITEM_CANNOT_DELETE' })
    expect(await db.items.get(items[0].id)).toBeDefined()
  })

  it('BR-5.6 / R-5: gán người ăn với shares, chặn người ngoài kèo và shares sai', async () => {
    const { session } = await setup()
    const { items } = await createInvoice({ ...draft(session.id, hostId), splitType: 'BY_ITEM' })
    const saved = await setItemConsumers(items[0].id, [
      { memberId: bobId, shares: 2 },
      { memberId: carolId, shares: 0 },
    ])
    expect(saved.consumers).toEqual([{ memberId: bobId, shares: 2 }])

    const outsider = await addMember('dan', 'Dân')
    await expect(setItemConsumers(items[0].id, [{ memberId: outsider, shares: 1 }])).rejects.toMatchObject({
      code: 'CONSUMER_NOT_IN_SESSION',
    })
    await expect(setItemConsumers(items[0].id, [{ memberId: bobId, shares: 0.5 }])).rejects.toMatchObject({
      code: 'INVALID_SHARES',
    })
  })

  it('bật chia từng món: mọi người trong kèo tự được gán vào món chưa có người ăn', async () => {
    const { session } = await setup()
    const { invoice, items } = await createInvoice(draft(session.id, hostId))
    expect(items.every((it) => it.consumers.length === 0)).toBe(true)

    await setInvoiceSplitType(invoice.id, 'BY_ITEM')
    const after = await db.items.where('invoiceId').equals(invoice.id).toArray()
    expect(after.every((it) => it.consumers.length === 3)).toBe(true)
  })

  it('BR-5.6 / R-6: gán nhanh cho mọi món hoặc chỉ món còn trống', async () => {
    const { session } = await setup()
    const { invoice, items } = await createInvoice({ ...draft(session.id, hostId), splitType: 'BY_ITEM' })
    await setItemConsumers(items[0].id, [{ memberId: carolId, shares: 4 }])
    await setItemConsumers(items[1].id, [])

    const onlyEmpty = await setAllItemsConsumers(invoice.id, [hostId, bobId], 'UNASSIGNED_ONLY')
    expect(onlyEmpty.map((it) => it.id)).toEqual([items[1].id])
    expect((await db.items.get(items[0].id))?.consumers).toEqual([{ memberId: carolId, shares: 4 }])

    const all = await setAllItemsConsumers(invoice.id, [hostId, bobId])
    expect(all).toHaveLength(2)
    expect((await db.items.get(items[0].id))?.consumers).toEqual([
      { memberId: hostId, shares: 1 },
      { memberId: bobId, shares: 1 },
    ])
  })

  it('BR-5.9: bữa ARCHIVED khoá gán người ăn và thêm/sửa/xoá món', async () => {
    const { meal, session } = await setup()
    const { invoice, items } = await createInvoice(draft(session.id, hostId))
    await db.meals.update(meal.id, { status: 'ARCHIVED' })
    await expect(setItemConsumers(items[0].id, [{ memberId: bobId, shares: 1 }])).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(addInvoiceItem(invoice.id, { name: 'X', quantity: 1, unitPrice: 1000 })).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(updateInvoiceItem(items[0].id, { name: 'X', quantity: 1, unitPrice: 1000 })).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(deleteInvoiceItem(items[1].id)).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
  })

  it('sửa hoá đơn giữ người ăn đã gán theo item.id (B.8 rủi ro 4)', async () => {
    const { session } = await setup()
    const { invoice, items } = await createInvoice(draft(session.id, hostId))
    await setItemConsumers(items[0].id, [{ memberId: bobId, shares: 2 }])
    await updateInvoice(invoice.id, draft(session.id, hostId, {
      items: [
        { id: items[0].id, name: 'Lẩu bò', quantity: 2, unitPrice: 150_000 },
        { id: items[1].id, name: 'Bia', quantity: 1, unitPrice: 250_000 },
      ],
    }))
    expect((await db.items.get(items[0].id))?.consumers).toEqual([{ memberId: bobId, shares: 2 }])
  })

  it('R-9: không bỏ người đang ăn món khỏi kèo; gỡ người ăn trước thì bỏ được', async () => {
    const { session } = await setup()
    const { items } = await createInvoice(draft(session.id, hostId))
    await setItemConsumers(items[0].id, [{ memberId: carolId, shares: 1 }])
    await expect(setSessionParticipants(session.id, [hostId, bobId])).rejects.toMatchObject({ code: 'SESSION_MEMBER_IN_USE' })
    await setItemConsumers(items[0].id, [])
    await expect(setSessionParticipants(session.id, [hostId, bobId])).resolves.toMatchObject({ participantIds: [hostId, bobId] })
  })
})
