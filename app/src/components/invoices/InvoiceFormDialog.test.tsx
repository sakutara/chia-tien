import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { initMealPeople } from '../../services/mealPeopleService'
import { addSession } from '../../services/sessionService'
import type { Meal, Member } from '../../types'
import InvoiceFormDialog from './InvoiceFormDialog'

afterEach(cleanup)

beforeEach(async () => {
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
    id: crypto.randomUUID(), title: 'Bữa', date: '2026-10-19', status: 'ACTIVE',
    participantIds: [init.hostMemberId, bob.id], hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: now, updatedAt: now,
  }
  await db.meals.put(meal)
  const session = await addSession(meal.id, 'Kèo 1')
  const participants = await db.members.where('id').anyOf(meal.participantIds).toArray()
  return { session, participants, host: init.hostMemberId }
}

describe('InvoiceFormDialog — giao diện gọn', () => {
  it('đặt chụp/tải ảnh lên trên cùng; công tắc chi tiết món và chia từng món chỉ hiện khi nhập tay', async () => {
    const f = await fixture()
    render(<InvoiceFormDialog session={f.session} participants={f.participants} defaultPayerId={f.host} onClose={() => {}} onSaved={() => {}} />)
    const dialog = await screen.findByRole('dialog', { name: 'Thêm hoá đơn' })

    const camera = within(dialog).getByRole('button', { name: 'Chụp ảnh' })
    const vendor = within(dialog).getByLabelText('Quán')
    expect(camera.compareDocumentPosition(vendor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const details = within(dialog).getByRole('switch', { name: 'Nhập chi tiết món' })
    expect(details.getAttribute('aria-checked')).toBe('true')
    expect(within(dialog).getByRole('switch', { name: 'Chia từng món' }).getAttribute('aria-checked')).toBe('false')

    // tắt "chi tiết món" → chỉ nhập tổng: ô tiền hàng thay danh sách món, hết công tắc chia
    await userEvent.click(details)
    expect(within(dialog).getByLabelText(/Tiền hàng/)).toBeTruthy()
    expect(within(dialog).queryByRole('switch', { name: 'Chia từng món' })).toBeNull()
    expect(within(dialog).queryByLabelText('Tên món 1')).toBeNull()
  })

  it('lưu hoá đơn chỉ nhập tổng bằng các nút icon', async () => {
    const f = await fixture()
    const onSaved = vi.fn()
    render(<InvoiceFormDialog session={f.session} participants={f.participants} defaultPayerId={f.host} onClose={() => {}} onSaved={onSaved} />)
    const dialog = await screen.findByRole('dialog', { name: 'Thêm hoá đơn' })
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Nhập chi tiết món' }))
    await userEvent.type(within(dialog).getByLabelText(/Tiền hàng/), '200k')
    expect(within(dialog).getByText(/Tổng: 200\.000/)).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu hoá đơn' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(await db.invoices.toArray()).toMatchObject([{ inputMode: 'TOTAL_ONLY', splitType: 'EQUAL_TOTAL', totalAmount: 200_000 }])
  })

  it('giảm giá, phí phục vụ và VAT thu gọn mặc định', async () => {
    const f = await fixture()
    render(<InvoiceFormDialog session={f.session} participants={f.participants} defaultPayerId={f.host} onClose={() => {}} onSaved={() => {}} />)
    const toggle = await screen.findByRole('button', { name: 'Điều chỉnh' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByLabelText('VAT')).toBeNull()
    await userEvent.click(toggle)
    expect(screen.getByLabelText('VAT')).toBeTruthy()
  })
})
