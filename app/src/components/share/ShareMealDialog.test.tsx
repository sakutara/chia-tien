import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { createInvoice } from '../../services/invoiceService'
import { initMealPeople } from '../../services/mealPeopleService'
import { addSession } from '../../services/sessionService'
import { createMeal } from '../../services/mealService'
import ShareMealDialog from './ShareMealDialog'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'share')
})

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

/** Bữa 2 người: chủ app trả 90 000 chia đều, Bình nợ 45 000. */
async function fixture() {
  const meal = await createMeal({ title: 'Lẩu cuối tuần', date: '2026-10-19' })
  const init = await initMealPeople()
  const now = new Date().toISOString()
  await db.members.put({ id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
  await db.meals.update(meal.id, { participantIds: [init.hostMemberId, 'bob'] })
  const session = await addSession(meal.id, 'Kèo 1')
  const none = { mode: 'NONE' as const, value: 0 }
  await createInvoice({
    sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'TOTAL_ONLY', items: [],
    subtotalAmount: 90_000, discount: none, service: none, vat: none,
  })
  return meal.id
}

describe('ShareMealDialog (Epic 8: BR-8.5, BR-8.6, R-4, R-5)', () => {
  it('xem trước đúng định dạng: tên bữa, dòng chuyển tiền, và link snapshot ở dòng cuối', async () => {
    const mealId = await fixture()
    render(<ShareMealDialog mealId={mealId} onClose={() => {}} />)
    const preview = await screen.findByLabelText('Nội dung tin nhắn')
    const lines = preview.textContent!.split('\n')
    expect(lines[0]).toBe('Lẩu cuối tuần')
    expect(lines[1]).toBe('- Bình: chuyển cho Tôi 45.000 ₫')
    expect(lines.at(-1)).toMatch(/\?s=/)
  })

  it('gửi nhanh chỉ có Facebook và Zalo, dùng đúng link snapshot', async () => {
    const mealId = await fixture()
    render(<ShareMealDialog mealId={mealId} onClose={() => {}} />)
    await screen.findByLabelText('Nội dung tin nhắn')
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Facebook', 'Zalo'])
    expect(screen.getByRole('link', { name: 'Facebook' }).getAttribute('href')).toContain(encodeURIComponent('?s='))
  })

  it('ô tích Gửi link / Gửi QR đổi nhãn và chuyển sang chế độ ảnh QR', async () => {
    const mealId = await fixture()
    render(<ShareMealDialog mealId={mealId} onClose={() => {}} />)
    await screen.findByLabelText('Nội dung tin nhắn')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi QR' }))
    expect(screen.getByRole('button', { name: 'Gửi link' })).toBeTruthy()
    expect(screen.queryByLabelText('Nội dung tin nhắn')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Facebook' })).toBeNull()
  })

  it('sao chép riêng link và báo "Đã sao chép"', async () => {
    const mealId = await fixture()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<ShareMealDialog mealId={mealId} onClose={() => {}} />)
    await screen.findByLabelText('Nội dung tin nhắn')
    await userEvent.click(screen.getByRole('button', { name: 'Chỉ sao chép Link Snapshot' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toMatch(/^http.*\?s=/)
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Đã sao chép')
  })

  it('chia sẻ qua ứng dụng khác gọi navigator.share; người dùng tự đóng menu thì không báo lỗi', async () => {
    const mealId = await fixture()
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('closed'), { name: 'AbortError' }))
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(<ShareMealDialog mealId={mealId} onClose={() => {}} />)
    await screen.findByLabelText('Nội dung tin nhắn')
    await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ qua ứng dụng khác' }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(share.mock.calls[0][0]).toMatchObject({ title: 'Lẩu cuối tuần', text: expect.stringContaining('?s=') })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('ẩn nút chia sẻ hệ thống khi trình duyệt không hỗ trợ Web Share', async () => {
    const mealId = await fixture()
    render(<ShareMealDialog mealId={mealId} onClose={() => {}} />)
    await screen.findByLabelText('Nội dung tin nhắn')
    expect(screen.queryByRole('button', { name: 'Chia sẻ qua ứng dụng khác' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Sao chép toàn bộ tin nhắn' })).toBeTruthy()
  })
})
