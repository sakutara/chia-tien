import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { createInvoice } from '../../services/invoiceService'
import { initMealPeople } from '../../services/mealPeopleService'
import { addSession } from '../../services/sessionService'
import type { Meal, Member } from '../../types'
import SettlementPanel from './SettlementPanel'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

/** Bữa 2 người: chủ app trả 90 000 cho cả hai (mỗi người nợ 45 000 → Bình phải trả chủ app). */
async function fixture(): Promise<{ meal: Meal; host: Member; bob: Member }> {
  const init = await initMealPeople()
  const now = new Date().toISOString()
  const bob: Member = { id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now }
  await db.members.put(bob)
  const meal: Meal = {
    id: crypto.randomUUID(), title: 'Lẩu', date: '2026-10-19', status: 'ACTIVE',
    participantIds: [init.hostMemberId, bob.id], hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: now, updatedAt: now,
  }
  await db.meals.put(meal)
  const session = await addSession(meal.id, 'Kèo 1')
  await createInvoice({
    sessionId: session.id,
    payerMemberId: init.hostMemberId,
    inputMode: 'TOTAL_ONLY',
    items: [],
    subtotalAmount: 90_000,
    discount: { mode: 'NONE', value: 0 },
    service: { mode: 'NONE', value: 0 },
    vat: { mode: 'NONE', value: 0 },
  })
  const host = (await db.members.get(init.hostMemberId))!
  return { meal: (await db.meals.get(meal.id))!, host, bob }
}

describe('SettlementPanel (Epic 6: BR-6.4, BR-6.5, BR-6.6, BR-6.7)', () => {
  it('bảng quyết toán dạng slide nằm trong chi tiết quyết toán, mặc định đóng', async () => {
    const f = await fixture()
    render(<SettlementPanel meal={f.meal} readOnly={false} />)
    const toggle = await screen.findByRole('button', { name: 'Chi tiết quyết toán' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('list', { name: 'Thực thể thanh toán' })).toBeNull()
    expect(screen.queryByLabelText(`Giải trình của ${f.bob.name}`)).toBeNull()
    // hướng dẫn chuyển tiền vẫn hiện ngoài khối thu gọn
    expect(screen.getByLabelText('Hướng dẫn chuyển tiền')).toBeTruthy()

    await userEvent.click(toggle)
    const groups = await screen.findByRole('list', { name: 'Thực thể thanh toán' })
    const bobGroup = within(groups).getByRole('listitem', { name: `Thực thể ${f.bob.name}` })
    expect(bobGroup.textContent).toContain('Phải trả')
    // giải trình nằm trong khối của thực thể, đóng sẵn
    expect(screen.queryByLabelText(`Giải trình của ${f.bob.name}`)).toBeNull()
    await userEvent.click(within(bobGroup).getByRole('button', { name: `Chi tiết ${f.bob.name}` }))
    expect(await screen.findByLabelText(`Giải trình của ${f.bob.name}`)).toBeTruthy()
  })

  it('tick từng khoản chuyển ghi vào bữa; tiến độ đếm theo số khoản chuyển', async () => {
    const f = await fixture()
    render(<SettlementPanel meal={f.meal} readOnly={false} />)
    // Không còn mục "Đã thanh toán" theo người
    expect(screen.queryByRole('list', { name: 'Đánh dấu thanh toán' })).toBeNull()
    expect(await screen.findByRole('status', { name: 'Đã thanh toán 0/1 khoản chuyển tiền' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: `Đã chuyển: ${f.bob.name} cho ${f.host.name}` }))
    await waitFor(async () => expect((await db.meals.get(f.meal.id))!.settlementStatuses[`${f.bob.id}->${f.host.id}`]?.isPaid).toBe(true))
    expect(await screen.findByRole('status', { name: 'Đã thanh toán xong toàn bữa' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: `Đã chuyển: ${f.bob.name} cho ${f.host.name}` }))
    expect(await screen.findByRole('status', { name: 'Đã thanh toán 0/1 khoản chuyển tiền' })).toBeTruthy()
  })

  it('nhờ chủ trì thu: mỗi khoản chuyển một ô tick, không có khoản từ chủ trì cho chính chủ trì', async () => {
    const f = await fixture()
    await db.meals.update(f.meal.id, { settlementMode: 'HOST_MEDIATED' })
    render(<SettlementPanel meal={{ ...f.meal, settlementMode: 'HOST_MEDIATED' }} readOnly={false} />)
    expect(await screen.findByRole('status', { name: 'Đã thanh toán 0/1 khoản chuyển tiền' })).toBeTruthy()
    const list = screen.getByLabelText('Hướng dẫn chuyển tiền')
    expect(within(list).getAllByRole('button', { name: /^Đã chuyển:/ })).toHaveLength(1)
  })

  it('công tắc nhờ người chủ trì lưu chế độ vào bữa', async () => {
    const f = await fixture()
    render(<SettlementPanel meal={f.meal} readOnly={false} />)
    await userEvent.click(await screen.findByRole('button', { name: /Nhờ chủ trì/ }))
    await waitFor(async () => expect((await db.meals.get(f.meal.id))!.settlementMode).toBe('HOST_MEDIATED'))
  })

  it('bữa đã lưu trữ chỉ xem: không cho đổi chế độ hay đánh dấu', async () => {
    const f = await fixture()
    render(<SettlementPanel meal={{ ...f.meal, status: 'ARCHIVED' }} readOnly />)
    expect((await screen.findByRole('button', { name: `Đã chuyển: ${f.bob.name} cho ${f.host.name}` })).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /Nhờ chủ trì|Mỗi người tự chuyển/ }).hasAttribute('disabled')).toBe(true)
  })
})
