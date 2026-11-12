import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { generateId } from '../../lib/id'
import { initMealPeople } from '../../services/mealPeopleService'
import { runOcr } from '../../services/ocrService'
import { markOcrModelReady } from '../../services/ocrModelConsent'
import { addSession } from '../../services/sessionService'
import type * as IdModule from '../../lib/id'
import type { Meal, Member } from '../../types'
import InvoiceFormDialog from './InvoiceFormDialog'

// Canvas không có trong jsdom và OCR thật cần worker: thay runOcr bằng hàm giả, còn lại dùng code thật.
vi.mock('../../services/ocrService', () => ({ runOcr: vi.fn(async () => ['']) }))
// Id của hoá đơn đang soạn là generateId() đầu tiên lúc render: đặt trước để biết bản ghi ảnh gắn vào đâu.
vi.mock('../../lib/id', async (importOriginal) => {
  const actual = await importOriginal<typeof IdModule>()
  return { ...actual, generateId: vi.fn(actual.generateId) }
})

// fake-indexeddb không clone được File của jsdom: dùng File của Node như các test lưu trữ khác.
const NODE_BUFFER: string = 'node:buffer'
type NodeFileCtor = new (bits: BlobPart[], name: string, options?: FilePropertyBag) => File
const { File: NodeFile } = (await import(/* @vite-ignore */ NODE_BUFFER)) as { File: NodeFileCtor }

const DRAFT_ID = 'draft-ocr-1'

afterEach(cleanup)

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  vi.mocked(runOcr).mockClear()
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

async function fixture() {
  const init = await initMealPeople()
  const now = new Date().toISOString()
  const bob: Member = { id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now }
  await db.members.put(bob)
  const meal: Meal = {
    id: crypto.randomUUID(),
    title: 'Bữa',
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds: [init.hostMemberId, bob.id],
    hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: now,
    updatedAt: now,
  }
  await db.meals.put(meal)
  const session = await addSession(meal.id, 'Kèo 1')
  const participants = await db.members.where('id').anyOf(meal.participantIds).toArray()
  return { session, participants, host: init.hostMemberId, mealId: meal.id }
}

/** Mở form với một ảnh đã lưu của hoá đơn đang soạn (chưa quét). */
async function renderWithImage() {
  const f = await fixture()
  await db.invoice_files.put({
    id: 'file-1',
    mealId: f.mealId,
    sessionId: f.session.id,
    invoiceId: DRAFT_ID,
    fileName: 'bill.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 7,
    createdAt: new Date().toISOString(),
    blobData: new NodeFile(['bill'], 'bill.jpg', { type: 'image/jpeg' }),
  } as never)
  vi.mocked(generateId).mockReturnValueOnce(DRAFT_ID)
  render(<InvoiceFormDialog session={f.session} participants={f.participants} defaultPayerId={f.host} onClose={() => {}} onSaved={() => {}} />)
  const dialog = await screen.findByRole('dialog', { name: 'Thêm hoá đơn' })
  return { dialog, f }
}

const scanButton = (dialog: HTMLElement) => within(dialog).findByRole('button', { name: 'Quét lại bill (OCR)' })

describe('InvoiceFormDialog — hỏi trước khi tải bộ đọc chữ', () => {
  it('chưa sẵn sàng: hiện hộp thoại; "Để sau" không gọi runOcr, ảnh vẫn còn', async () => {
    const { dialog } = await renderWithImage()
    await userEvent.click(await scanButton(dialog))

    const consent = await screen.findByRole('dialog', { name: 'Tải bộ đọc chữ lần đầu' })
    expect(within(consent).getByText(/khoảng 110 MB/)).toBeTruthy()
    await userEvent.click(within(consent).getByRole('button', { name: 'Để sau' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tải bộ đọc chữ lần đầu' })).toBeNull())
    expect(runOcr).not.toHaveBeenCalled()
    expect(await db.invoice_files.get('file-1')).toBeDefined()
    expect(screen.getByText(/Chưa tải bộ đọc chữ/)).toBeTruthy()
  })

  it('chưa sẵn sàng: "Tải và quét" gọi runOcr', async () => {
    const { dialog } = await renderWithImage()
    await userEvent.click(await scanButton(dialog))

    const consent = await screen.findByRole('dialog', { name: 'Tải bộ đọc chữ lần đầu' })
    await userEvent.click(within(consent).getByRole('button', { name: 'Tải và quét' }))

    await waitFor(() => expect(runOcr).toHaveBeenCalledTimes(1))
  })

  it('đã đồng ý trong phiên thì không hỏi lại dù mô hình chưa tải xong', async () => {
    const { dialog } = await renderWithImage()
    await userEvent.click(await scanButton(dialog))
    const consent = await screen.findByRole('dialog', { name: 'Tải bộ đọc chữ lần đầu' })
    await userEvent.click(within(consent).getByRole('button', { name: 'Tải và quét' }))
    await waitFor(() => expect(runOcr).toHaveBeenCalledTimes(1))

    await userEvent.click(await scanButton(dialog))
    await waitFor(() => expect(runOcr).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('dialog', { name: 'Tải bộ đọc chữ lần đầu' })).toBeNull()
  })

  it('đã sẵn sàng: không hỏi, quét luôn', async () => {
    markOcrModelReady()
    const { dialog } = await renderWithImage()
    await userEvent.click(await scanButton(dialog))

    await waitFor(() => expect(runOcr).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog', { name: 'Tải bộ đọc chữ lần đầu' })).toBeNull()
  })
})
