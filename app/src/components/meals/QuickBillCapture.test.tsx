import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { markOcrModelReady } from '../../services/ocrModelConsent'
import { runOcr } from '../../services/ocrService'
import { PeopleError } from '../../services/peopleErrors'
import type * as FileStorage from '../../services/fileStorageService'
import QuickBillCapture from './QuickBillCapture'

// OCR thật cần worker, nén ảnh cần Canvas: thay bằng hàm giả.
vi.mock('../../services/ocrService', () => ({ runOcr: vi.fn(async () => ['']) }))
vi.mock('../../lib/imageCompress', () => ({
  compressImage: vi.fn(async (file: File) => ({ file, before: file.size, after: file.size, compressed: false, plan: {} })),
  probeImage: vi.fn(async () => ({ width: 1000, height: 1000 })),
}))

// Ảnh đọc lại từ fake-indexeddb không còn là Blob: trả Blob của Node để ảnh thu nhỏ dựng được như trên trình duyệt.
vi.mock('../../services/fileStorageService', async (importOriginal) => {
  const actual = await importOriginal<typeof FileStorage>()
  const { Blob: NodeBlob } = (await import(/* @vite-ignore */ 'node:buffer')) as { Blob: typeof Blob }
  return { ...actual, getFileBlob: vi.fn(async () => new NodeBlob(['bill'], { type: 'image/jpeg' })) }
})

const MATCHING = 'PHO THIN\nNgày: 05/03/2026\nPhở bò 2 50.000 100.000\nTrà đá 1 10.000 10.000\nTổng cộng 110.000'
const MISMATCH = 'PHO THIN\nNgày: 05/03/2026\nPhở bò 2 50.000 100.000\nTrà đá 1 10.000 10.000\nTổng cộng 150.000'

// fake-indexeddb không clone được File của jsdom: dùng File của Node như các test lưu trữ khác.
const NODE_BUFFER: string = 'node:buffer'
type NodeFileCtor = new (bits: BlobPart[], name: string, options?: FilePropertyBag) => File
const { File: NodeFile } = (await import(/* @vite-ignore */ NODE_BUFFER)) as { File: NodeFileCtor }
const bill = (type = 'image/jpeg') => new NodeFile(['x'.repeat(100)], 'bill.jpg', { type })

afterEach(cleanup)

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  vi.mocked(runOcr).mockReset()
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
  markOcrModelReady()
})

async function snap(file = bill()) {
  const onDone = vi.fn()
  render(<QuickBillCapture onDone={onDone} />)
  // jsdom không có camera trong trang: nút mở ứng dụng camera của máy (ô chọn tệp ẩn).
  expect(screen.getByRole('button', { name: 'Chụp bill tạo bữa nhanh' })).toBeTruthy()
  await userEvent.upload(screen.getByLabelText('Chụp bill tạo bữa nhanh', { selector: 'input' }), file, { applyAccept: false })
  return onDone
}

describe('QuickBillCapture', () => {
  it('bill đọc khớp: tự tạo bữa theo ngày bill, kèo theo quán, lưu hoá đơn rồi báo xong', async () => {
    vi.mocked(runOcr).mockResolvedValue([MATCHING])
    const onDone = await snap()
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))

    const [meal] = await db.meals.toArray()
    expect(onDone).toHaveBeenCalledWith(meal.id)
    expect(meal).toMatchObject({ status: 'ACTIVE', date: '2026-03-05', title: 'Bữa 05/03/2026' })
    const [session] = await db.sessions.where('mealId').equals(meal.id).toArray()
    expect(session.name).toBe('Kèo PHO THIN')
    const [invoice] = await db.invoices.toArray()
    expect(invoice).toMatchObject({ sessionId: session.id, totalAmount: 110000, payerMemberId: meal.hostMemberId })
    expect(invoice.fileIds).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('bill lệch tổng: mở form đã điền, lưu xong thì báo xong', async () => {
    vi.mocked(runOcr).mockResolvedValue([MISMATCH])
    const onDone = await snap()
    const dialog = await screen.findByRole('dialog', { name: 'Thêm hoá đơn' })
    await waitFor(() => expect((within(dialog).getByLabelText('Quán') as HTMLInputElement).value).toBe('PHO THIN'))
    expect(within(dialog).getByText(/lệch tổng trên bill/)).toBeTruthy()
    expect(await db.invoices.count()).toBe(0)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu hoá đơn' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(await db.invoices.count()).toBe(1)
    expect((await db.meals.toArray())[0].date).toBe('2026-03-05')
  })

  it('đóng form không lưu: xoá bữa, kèo và ảnh vừa tạo', async () => {
    vi.mocked(runOcr).mockResolvedValue([MISMATCH])
    const onDone = await snap()
    const dialog = await screen.findByRole('dialog', { name: 'Thêm hoá đơn' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await waitFor(async () => expect(await db.meals.count()).toBe(0))
    expect(await db.sessions.count()).toBe(0)
    await waitFor(async () => expect(await db.invoice_files.count()).toBe(0))
    expect(onDone).not.toHaveBeenCalled()
  })

  it('từ chối tải bộ đọc chữ: mở form kèm thông báo, không quét', async () => {
    localStorage.clear()
    await snap()
    const consent = await screen.findByRole('dialog', { name: 'Tải bộ đọc chữ lần đầu' })
    await userEvent.click(within(consent).getByRole('button', { name: 'Để sau' }))
    const dialog = await screen.findByRole('dialog', { name: 'Thêm hoá đơn' })
    expect(within(dialog).getByText(/Chưa tải bộ đọc chữ/)).toBeTruthy()
    expect(runOcr).not.toHaveBeenCalled()
  })

  it('quét lỗi: mở form kèm lý do', async () => {
    vi.mocked(runOcr).mockRejectedValue(new PeopleError('OCR_FAILED', 'Bộ đọc chữ lỗi.'))
    await snap()
    const dialog = await screen.findByRole('dialog', { name: 'Thêm hoá đơn' })
    expect(within(dialog).getByText(/Bộ đọc chữ lỗi\./)).toBeTruthy()
  })

  it('ảnh không lưu được: báo lỗi, không để lại bữa', async () => {
    const onDone = await snap(bill('image/gif'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Không tạo được bữa từ ảnh này')
    expect(await db.meals.count()).toBe(0)
    expect(onDone).not.toHaveBeenCalled()
  })
})
