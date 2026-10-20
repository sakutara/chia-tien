import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import type { Meal } from '../types'
import { initMealPeople } from './mealPeopleService'
import { MAX_IMAGES_PER_INVOICE, addInvoicePdf } from './invoiceFileService'
import { importPdf } from '../lib/pdfImport'

// pdf.js và Canvas không chạy trong jsdom: giả lập kết quả dựng trang, giữ nguyên `isPdfFile` thật.
vi.mock('../lib/pdfImport', async (original) => ({
  ...(await original<typeof import('../lib/pdfImport')>()),
  importPdf: vi.fn(),
}))

const page = (n: number, text?: string) => ({ file: new File(['x'.repeat(50)], `hd-p${n}.jpg`, { type: 'image/jpeg' }), text })
const pdf = (name = 'hd.pdf') => new File(['%PDF-1.4'], name, { type: 'application/pdf' })

async function setup(hostId: string) {
  const now = new Date().toISOString()
  const meal: Meal = {
    id: crypto.randomUUID(), title: 'Bữa', date: '2026-10-19', status: 'ACTIVE', participantIds: [hostId], hostMemberId: hostId,
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: now, updatedAt: now,
  }
  await db.meals.put(meal)
  const sessionId = crypto.randomUUID()
  await db.sessions.put({ id: sessionId, mealId: meal.id, name: 'Kèo 1', orderIndex: 0, participantIds: [hostId], createdAt: now })
  return { mealId: meal.id, sessionId, invoiceId: crypto.randomUUID() }
}

describe('addInvoicePdf (Epic 4: nhập PDF làm hoá đơn)', () => {
  let hostId: string
  beforeEach(async () => {
    vi.mocked(importPdf).mockReset()
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()))
    })
    await ensureDefaultData()
    hostId = (await initMealPeople()).hostMemberId
  })

  it('mỗi trang thành một ảnh; trang có lớp chữ lưu sẵn văn bản (khỏi OCR), trang ảnh quét để trống', async () => {
    const ctx = await setup(hostId)
    vi.mocked(importPdf).mockResolvedValue({ pages: [page(1, 'Cộng tiền hàng 1.170.000'), page(2)], totalPages: 2 })

    const result = await addInvoicePdf({ ...ctx, file: pdf() })

    expect(result.truncated).toBe(false)
    expect(result.records).toHaveLength(2)
    const stored = await db.invoice_files.where('invoiceId').equals(ctx.invoiceId).sortBy('createdAt')
    expect(stored.map((f) => f.ocrRawText)).toEqual(['Cộng tiền hàng 1.170.000', undefined])
    expect(stored.every((f) => f.fileName.endsWith('.jpg'))).toBe(true)
  })

  it('chỉ nhận số trang còn chỗ và báo bị cắt', async () => {
    const ctx = await setup(hostId)
    for (let i = 0; i < MAX_IMAGES_PER_INVOICE - 1; i++) {
      await db.invoice_files.put({ id: crypto.randomUUID(), ...ctx, fileName: `a${i}.jpg`, mimeType: 'image/jpeg', sizeBytes: 1, createdAt: new Date().toISOString(), blobData: new Blob(['x']) } as never)
    }
    vi.mocked(importPdf).mockResolvedValue({ pages: [page(1, 'Một trang có chữ rất rõ ràng')], totalPages: 3 })

    const result = await addInvoicePdf({ ...ctx, file: pdf() })

    expect(vi.mocked(importPdf)).toHaveBeenCalledWith(expect.anything(), 1)
    expect(result.truncated).toBe(true)
    await expect(addInvoicePdf({ ...ctx, file: pdf() })).rejects.toMatchObject({ code: 'TOO_MANY_FILES' })
  })

  it('từ chối tệp không phải PDF và PDF quá 40 MB; lỗi đọc PDF được truyền nguyên', async () => {
    const ctx = await setup(hostId)
    await expect(addInvoicePdf({ ...ctx, file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }) })).rejects.toMatchObject({ code: 'FILE_TYPE_NOT_ALLOWED' })
    const huge = pdf()
    Object.defineProperty(huge, 'size', { value: 41 * 1024 * 1024 })
    await expect(addInvoicePdf({ ...ctx, file: huge })).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })

    const { PeopleError } = await import('./peopleErrors')
    vi.mocked(importPdf).mockRejectedValue(new PeopleError('PDF_ENCRYPTED', 'mật khẩu'))
    await expect(addInvoicePdf({ ...ctx, file: pdf() })).rejects.toMatchObject({ code: 'PDF_ENCRYPTED' })
  })
})
