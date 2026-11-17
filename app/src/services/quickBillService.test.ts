import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import { computeInvoice, type InvoiceRulesDraft } from '../domain/invoiceRules'
import { computeMealSettlement } from '../domain/settlementEngine'
import { addParticipant } from './mealPeopleService'
import { applyQuickMealDate, cancelQuickBill, saveQuickBillInvoice, startQuickBill } from './quickBillService'
import { setSessionParticipants } from './sessionService'

// Canvas không có trong jsdom: nén giả lập trả về file gốc.
vi.mock('../lib/imageCompress', () => ({
  compressImage: vi.fn(async (file: File) => ({ file, before: file.size, after: file.size, compressed: false, plan: {} })),
}))

const bill = (type = 'image/jpeg') => new File(['x'.repeat(100)], 'bill.jpg', { type })

const draft = (overrides: Partial<InvoiceRulesDraft> = {}): InvoiceRulesDraft => ({
  inputMode: 'ITEMIZED',
  vendorName: 'Phở Thìn',
  invoiceDate: '2026-03-05',
  items: [
    { name: 'Phở', quantity: 2, unitPrice: 50000, rawAmount: 100000 },
    { name: 'Trà đá', quantity: 1, unitPrice: 0, rawAmount: 0 },
  ],
  discount: { mode: 'NONE', value: 0 },
  service: { mode: 'NONE', value: 0 },
  vat: { mode: 'NONE', value: 0 },
  ...overrides,
})

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

describe('startQuickBill', () => {
  it('tạo bữa ACTIVE hôm nay, một kèo và lưu ảnh vào hoá đơn nháp', async () => {
    const start = await startQuickBill(bill(), new Date(2026, 10, 17, 12))
    expect(start.meal).toMatchObject({ status: 'ACTIVE', date: '2026-11-17', title: 'Bữa 17/11/2026' })
    expect(start.meal.participantIds).toEqual([start.meal.hostMemberId])
    const sessions = await db.sessions.where('mealId').equals(start.meal.id).toArray()
    expect(sessions.map((s) => s.id)).toEqual([start.session.id])
    expect(start.session.orderIndex).toBe(0)
    const files = await db.invoice_files.where('invoiceId').equals(start.invoiceId).toArray()
    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({ mealId: start.meal.id, sessionId: start.session.id })
  })

  it('lưu ảnh lỗi thì xoá bữa và kèo vừa tạo', async () => {
    await expect(startQuickBill(bill('image/gif'))).rejects.toMatchObject({ code: 'FILE_TYPE_NOT_ALLOWED' })
    expect(await db.meals.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.invoice_files.count()).toBe(0)
  })
})

describe('applyQuickMealDate', () => {
  it('đổi ngày và tên mặc định theo ngày trên bill', async () => {
    const start = await startQuickBill(bill(), new Date(2026, 10, 17, 12))
    await applyQuickMealDate(start.meal.id, '2026-03-05')
    expect(await db.meals.get(start.meal.id)).toMatchObject({ date: '2026-03-05', title: 'Bữa 05/03/2026' })
  })

  it('giữ hôm nay khi bill không có ngày hợp lệ', async () => {
    const start = await startQuickBill(bill(), new Date(2026, 10, 17, 12))
    await applyQuickMealDate(start.meal.id, undefined)
    await applyQuickMealDate(start.meal.id, '2026-02-30')
    expect(await db.meals.get(start.meal.id)).toMatchObject({ date: '2026-11-17', title: 'Bữa 17/11/2026' })
  })
})

describe('saveQuickBillInvoice', () => {
  it('lưu hoá đơn có ảnh, người ứng là chủ trì, chia đều, kèo đổi tên theo quán', async () => {
    const start = await startQuickBill(bill())
    const result = await saveQuickBillInvoice(start, draft(), 100000)
    expect(result?.invoice).toMatchObject({
      id: start.invoiceId,
      totalAmount: 100000,
      payerMemberId: start.meal.hostMemberId,
      splitType: 'EQUAL_TOTAL',
      inputMode: 'ITEMIZED',
    })
    expect(result?.invoice.fileIds).toHaveLength(1)
    expect((await db.sessions.get(start.session.id))?.name).toBe('Kèo Phở Thìn')
  })

  it('tổng bằng đúng tổng ghi trên bill, kể cả VAT', async () => {
    const start = await startQuickBill(bill())
    const d = draft({ vat: { mode: 'PERCENTAGE', value: 8 } })
    const result = await saveQuickBillInvoice(start, d, 108000)
    expect(result?.invoice.totalAmount).toBe(108000)
  })

  it('không lưu khi tổng tính được lệch tổng bill hoặc bill không có tổng', async () => {
    const start = await startQuickBill(bill())
    expect(await saveQuickBillInvoice(start, draft(), 99000)).toBeNull()
    expect(await saveQuickBillInvoice(start, draft(), undefined)).toBeNull()
    expect(await db.invoices.count()).toBe(0)
  })

  it('chia đều cho 3 người thì tổng các phần bằng đúng tổng hoá đơn', async () => {
    const start = await startQuickBill(bill())
    const d = draft({ items: [{ name: 'Lẩu', quantity: 1, unitPrice: 100000, rawAmount: 100000 }] })
    expect(computeInvoice(d).bill.totalAmount).toBe(100000)
    await saveQuickBillInvoice(start, d, 100000)
    const now = new Date().toISOString()
    for (const id of ['b', 'c']) {
      await db.members.put({ id, name: id, normalizedName: id, avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
      await addParticipant(start.meal.id, id)
    }
    const host = start.meal.hostMemberId
    await setSessionParticipants(start.session.id, [host, 'b', 'c'])
    await db.invoices.update(start.invoiceId, { equalSplitParticipantIds: [host, 'b', 'c'] })
    const [meal, members, sessions, invoices, items] = await Promise.all([
      db.meals.get(start.meal.id),
      db.members.toArray(),
      db.sessions.toArray(),
      db.invoices.toArray(),
      db.items.toArray(),
    ])
    const result = computeMealSettlement({ meal: meal!, members, sessions, invoices, items })
    const owed = result.memberBreakdowns.map((m) => m.totalOwed)
    expect(owed).toHaveLength(3)
    expect(owed.reduce((a, b) => a + b, 0)).toBe(100000)
    expect(owed.every((v) => Number.isInteger(v))).toBe(true)
  })
})

describe('cancelQuickBill', () => {
  it('xoá bữa, kèo và ảnh vừa tạo', async () => {
    const start = await startQuickBill(bill())
    await cancelQuickBill(start.meal.id)
    expect(await db.meals.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.invoice_files.count()).toBe(0)
  })
})
