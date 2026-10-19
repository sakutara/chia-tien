import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import type { Invoice, Meal } from '../types'
import { initMealPeople } from './mealPeopleService'
import {
  MAX_IMAGES_PER_INVOICE,
  addInvoiceImage,
  discardDraftFiles,
  findDuplicateImages,
  removeInvoiceImage,
  saveOcrText,
  sweepOrphanFiles,
} from './invoiceFileService'
import { PeopleError } from './peopleErrors'

// Canvas không có trong jsdom: nén giả lập trả về file gốc (đường dẫn "không lợi thì giữ gốc").
vi.mock('../lib/imageCompress', () => ({
  compressImage: vi.fn(async (file: File) => ({
    file,
    before: file.size,
    after: file.size,
    compressed: false,
    plan: {},
  })),
}))

function bill(name = 'bill.jpg', type = 'image/jpeg'): File {
  return new File(['x'.repeat(100)], name, { type })
}

async function makeMeal(hostId: string): Promise<Meal> {
  const now = new Date().toISOString()
  const meal: Meal = {
    id: crypto.randomUUID(),
    title: 'Bữa test',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds: [hostId],
    hostMemberId: hostId,
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: now,
    updatedAt: now,
  }
  await db.meals.put(meal)
  return meal
}

async function makeSession(mealId: string, hostId: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.sessions.put({
    id,
    mealId,
    name: 'Kèo 1',
    orderIndex: 0,
    participantIds: [hostId],
    createdAt: new Date().toISOString(),
  })
  return id
}

async function makeInvoice(mealId: string, sessionId: string, payer: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.invoices.put({
    id,
    mealId,
    sessionId,
    payerMemberId: payer,
    totalAmount: 100_000,
    fileIds: [],
    createdAt: new Date().toISOString(),
  } as unknown as Invoice)
  return id
}

describe('invoiceFileService', () => {
  let hostId: string

  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()))
    })
    await ensureDefaultData()
    hostId = (await initMealPeople()).hostMemberId
  })

  it('từ chối định dạng không phải ảnh và ảnh quá 40 MB', async () => {
    const meal = await makeMeal(hostId)
    const sessionId = await makeSession(meal.id, hostId)
    const invoiceId = crypto.randomUUID()

    await expect(
      addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('a.gif', 'image/gif') }),
    ).rejects.toMatchObject({ code: 'FILE_TYPE_NOT_ALLOWED' })

    const huge = bill('big.jpg')
    Object.defineProperty(huge, 'size', { value: 41 * 1024 * 1024 })
    await expect(
      addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: huge }),
    ).rejects.toBeInstanceOf(PeopleError)
  })

  it('giới hạn 10 ảnh cho mỗi hoá đơn', async () => {
    const meal = await makeMeal(hostId)
    const sessionId = await makeSession(meal.id, hostId)
    const invoiceId = crypto.randomUUID()

    for (let i = 0; i < MAX_IMAGES_PER_INVOICE; i++) {
      await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill(`${i}.jpg`) })
    }
    await expect(
      addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('extra.jpg') }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_FILES' })
  })

  it('luôn nén ở mức Cân bằng và ghi dung lượng gốc để hiện "trước → sau"', async () => {
    const meal = await makeMeal(hostId)
    const sessionId = await makeSession(meal.id, hostId)
    const record = await addInvoiceImage({
      mealId: meal.id,
      sessionId,
      invoiceId: crypto.randomUUID(),
      file: bill(),
    })
    expect(record.originalSizeBytes).toBe(100)
    expect(record.compression).toBe('BALANCED')
  })

  it('đồng bộ fileIds của hoá đơn đã lưu khi thêm và xoá ảnh', async () => {
    const meal = await makeMeal(hostId)
    const sessionId = await makeSession(meal.id, hostId)
    const invoiceId = await makeInvoice(meal.id, sessionId, hostId)

    const first = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('1.jpg') })
    expect((await db.invoices.get(invoiceId))?.fileIds).toEqual([first.id])

    await removeInvoiceImage(first.id)
    expect((await db.invoices.get(invoiceId))?.fileIds).toEqual([])
    expect(await db.invoice_files.get(first.id)).toBeUndefined()
  })

  it('huỷ hoá đơn đang soạn thì xoá ảnh tạm, còn hoá đơn đã lưu thì giữ nguyên', async () => {
    const meal = await makeMeal(hostId)
    const sessionId = await makeSession(meal.id, hostId)
    const draftId = crypto.randomUUID()
    const savedId = await makeInvoice(meal.id, sessionId, hostId)

    await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: draftId, file: bill('draft.jpg') })
    await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: savedId, file: bill('saved.jpg') })

    await discardDraftFiles(draftId)
    expect(await db.invoice_files.where('invoiceId').equals(draftId).count()).toBe(0)

    await discardDraftFiles(savedId) // đã lưu: không làm gì
    expect(await db.invoice_files.where('invoiceId').equals(savedId).count()).toBe(1)
  })

  it('dọn ảnh mồ côi của bữa, giữ ảnh của hoá đơn còn tồn tại', async () => {
    const meal = await makeMeal(hostId)
    const sessionId = await makeSession(meal.id, hostId)
    const liveId = await makeInvoice(meal.id, sessionId, hostId)
    const orphanInvoice = crypto.randomUUID()

    await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: liveId, file: bill('live.jpg') })
    await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: orphanInvoice, file: bill('lost.jpg') })

    expect(await sweepOrphanFiles(meal.id)).toBe(1)
    expect(await db.invoice_files.where('invoiceId').equals(liveId).count()).toBe(1)
    expect(await db.invoice_files.where('invoiceId').equals(orphanInvoice).count()).toBe(0)
  })

  it('bữa đã lưu trữ không thêm và không xoá được ảnh (BR-4.12)', async () => {
    const meal = await makeMeal(hostId)
    const sessionId = await makeSession(meal.id, hostId)
    const invoiceId = await makeInvoice(meal.id, sessionId, hostId)
    const record = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('kept.jpg') })

    await db.meals.update(meal.id, { status: 'ARCHIVED' })

    await expect(
      addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('late.jpg') }),
    ).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    await expect(removeInvoiceImage(record.id)).rejects.toMatchObject({ code: 'MEAL_ARCHIVED' })
    expect(await db.invoice_files.get(record.id)).toBeDefined()
  })

  describe('findDuplicateImages (BR-4.18)', () => {
    const BILL = `LAU BO GO NGOC\nNgay 19/10/2026\nLau bo my 2 x 150.000 = 300.000\nBia Tiger 330ml 10 x 25.000 = 250.000\nTong cong 594.000`
    const BILL_RESCAN = `LẨU BÒ GỖ NGỌC\nNgày 19/10/2026\nLẩu bò mỹ 2 x 150.000 = 300.000\nBia Tiger 330ml 10 x 25.000 = 250.000\nTổng cộng 594.000`
    const OTHER = `CAFE SAI GON\nNgay 20/10/2026\nCa phe sua 2 x 30.000 = 60.000\nBanh flan 1 x 25.000 = 25.000\nTong cong 85.000`

    it('tìm ảnh trùng cùng hoá đơn và ở hoá đơn khác trong bữa', async () => {
      const meal = await makeMeal(hostId)
      const sessionId = await makeSession(meal.id, hostId)
      const invoiceA = await makeInvoice(meal.id, sessionId, hostId)
      const invoiceB = await makeInvoice(meal.id, sessionId, hostId)

      const first = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: invoiceA, file: bill('a.jpg') })
      await saveOcrText(first.id, BILL)
      const different = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: invoiceA, file: bill('b.jpg') })
      await saveOcrText(different.id, OTHER)
      const again = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: invoiceB, file: bill('c.jpg') })
      await saveOcrText(again.id, BILL_RESCAN)

      const dups = await findDuplicateImages(again.id)
      expect(dups).toHaveLength(1)
      expect(dups[0].duplicateOf.id).toBe(first.id)
      expect(dups[0].sameInvoice).toBe(false)

      const sameInvoice = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId: invoiceA, file: bill('d.jpg') })
      await saveOcrText(sameInvoice.id, BILL_RESCAN)
      const sameDups = await findDuplicateImages(sameInvoice.id)
      expect(sameDups.map((d) => d.sameInvoice)).toContain(true)
    })

    it('ảnh khác bill hoặc chưa có văn bản OCR thì không báo trùng', async () => {
      const meal = await makeMeal(hostId)
      const sessionId = await makeSession(meal.id, hostId)
      const invoiceId = await makeInvoice(meal.id, sessionId, hostId)
      const a = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('a.jpg') })
      await saveOcrText(a.id, BILL)
      const b = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('b.jpg') })
      await saveOcrText(b.id, OTHER)
      const c = await addInvoiceImage({ mealId: meal.id, sessionId, invoiceId, file: bill('c.jpg') })

      expect(await findDuplicateImages(b.id)).toEqual([])
      expect(await findDuplicateImages(c.id)).toEqual([])
    })

    it('không so với ảnh của bữa khác', async () => {
      const mealA = await makeMeal(hostId)
      const mealB = await makeMeal(hostId)
      const sessionA = await makeSession(mealA.id, hostId)
      const sessionB = await makeSession(mealB.id, hostId)
      const invoiceA = await makeInvoice(mealA.id, sessionA, hostId)
      const invoiceB = await makeInvoice(mealB.id, sessionB, hostId)
      const a = await addInvoiceImage({ mealId: mealA.id, sessionId: sessionA, invoiceId: invoiceA, file: bill('a.jpg') })
      await saveOcrText(a.id, BILL)
      const b = await addInvoiceImage({ mealId: mealB.id, sessionId: sessionB, invoiceId: invoiceB, file: bill('b.jpg') })
      await saveOcrText(b.id, BILL)
      expect(await findDuplicateImages(b.id)).toEqual([])
    })
  })
})
