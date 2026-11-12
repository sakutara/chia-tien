import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemberList from './MemberList'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { createInvoice } from '../../services/invoiceService'
import { createGroup, initMealPeople } from '../../services/mealPeopleService'
import { createMeal } from '../../services/mealService'
import { addSession } from '../../services/sessionService'
import type { GroupView } from '../../hooks/useMealPeople'
import type { Meal, Member } from '../../types'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

const now = new Date().toISOString()
const bobMember: Member = { id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now }

/** Bữa có chủ trì (app) và Bình. Trả về bữa mới nhất trong DB và các người. */
async function fixture() {
  const init = await initMealPeople()
  await db.members.put(bobMember)
  const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
  await db.meals.update(meal.id, { participantIds: [init.hostMemberId, 'bob'] })
  const host = (await db.members.get(init.hostMemberId)) as Member
  return { host, bob: bobMember, mealId: meal.id }
}

async function currentMeal(mealId: string): Promise<Meal> {
  return (await db.meals.get(mealId)) as Meal
}

function renderList(meal: Meal, participants: Member[], groups: GroupView[] = [], readOnly = false) {
  return render(<MemberList meal={meal} participants={participants} groups={groups} readOnly={readOnly} creatingGroup={false} onCloseCreate={() => {}} />)
}

describe('MemberList (BR-2.10)', () => {
  it('lists the participants and marks the host, who cannot be removed', async () => {
    const f = await fixture()
    renderList(await currentMeal(f.mealId), [f.host, f.bob])

    const list = screen.getByRole('list', { name: 'Người tham gia' })
    expect(within(list).getByText('Bình')).toBeTruthy()
    expect(within(list).getByLabelText('Chủ trì')).toBeTruthy()
    expect(screen.queryByRole('button', { name: `Bỏ ${f.host.name} khỏi bữa` })).toBeNull()
    expect(screen.getByRole('button', { name: 'Bỏ Bình khỏi bữa' })).toBeTruthy()
  })

  it('removes a participant who is not used anywhere', async () => {
    const f = await fixture()
    renderList(await currentMeal(f.mealId), [f.host, f.bob])

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ Bình khỏi bữa' }))
    await waitFor(async () => expect((await currentMeal(f.mealId)).participantIds).toEqual([f.host.id]))
  })

  it('explains why a member in use cannot be removed', async () => {
    const f = await fixture()
    const session = await addSession(f.mealId, 'Kèo 1')
    await createInvoice({
      sessionId: session.id,
      payerMemberId: f.bob.id,
      inputMode: 'TOTAL_ONLY',
      items: [],
      subtotalAmount: 90_000,
      discount: { mode: 'NONE', value: 0 },
      service: { mode: 'NONE', value: 0 },
      vat: { mode: 'NONE', value: 0 },
    })
    renderList(await currentMeal(f.mealId), [f.host, f.bob])

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ Bình khỏi bữa' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Không thể bỏ Bình: đang ứng tiền cho hoá đơn, đang nằm trong danh sách chia đều của hoá đơn.')
    expect((await currentMeal(f.mealId)).participantIds).toContain(f.bob.id)
  })

  it('asks first when the member has already been ticked as paid, and removes only after confirming', async () => {
    const f = await fixture()
    await db.meals.update(f.mealId, {
      settlementStatuses: { [f.bob.id]: { isPaid: true, paidAt: now } } as unknown as Meal['settlementStatuses'],
    })
    renderList(await currentMeal(f.mealId), [f.host, f.bob])

    await userEvent.click(screen.getByRole('button', { name: 'Bỏ Bình khỏi bữa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Bỏ người đã tick thanh toán?' })
    expect((await currentMeal(f.mealId)).participantIds).toContain(f.bob.id)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Bỏ khỏi bữa' }))
    await waitFor(async () => expect((await currentMeal(f.mealId)).participantIds).toEqual([f.host.id]))
  })

  it('shows a group as one chip; opening it lists its members and dissolves it on request', async () => {
    const f = await fixture()
    await createGroup(f.mealId, { name: 'Cặp đôi', memberIds: [f.host.id, f.bob.id] })
    const meal = await currentMeal(f.mealId)
    const groups: GroupView[] = meal.paymentGroups.map((g) => ({
      ...g,
      members: g.memberIds.map((id) => (id === f.host.id ? f.host : f.bob)),
    }))
    renderList(meal, [f.host, f.bob], groups)

    // Nhóm thay cho các thành viên của nó, nên không còn chip riêng của Bình
    expect(screen.queryByRole('button', { name: 'Bỏ Bình khỏi bữa' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Nhóm Cặp đôi' }))
    expect(screen.getByRole('group', { name: 'Chi tiết nhóm Cặp đôi' }).textContent).toContain('Bình')

    await userEvent.click(screen.getByRole('button', { name: 'Giải tán nhóm Cặp đôi' }))
    await waitFor(async () => expect((await currentMeal(f.mealId)).paymentGroups).toEqual([]))
  })

  it('shows an error when dissolving a group fails', async () => {
    const f = await fixture()
    await createGroup(f.mealId, { name: 'Cặp đôi', memberIds: [f.host.id, f.bob.id] })
    const meal = await currentMeal(f.mealId)
    const groups: GroupView[] = meal.paymentGroups.map((g) => ({
      ...g,
      members: g.memberIds.map((id) => (id === f.host.id ? f.host : f.bob)),
    }))
    renderList(meal, [f.host, f.bob], groups)
    // Nhóm đã bị xoá ở nơi khác trong khi màn hình còn hiện: giải tán sẽ thất bại.
    await db.meals.update(f.mealId, { paymentGroups: [] })

    await userEvent.click(screen.getByRole('button', { name: 'Nhóm Cặp đôi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Giải tán nhóm Cặp đôi' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Không tìm thấy nhóm.')
  })

  it('shows no editing controls when read-only', async () => {
    const f = await fixture()
    renderList(await currentMeal(f.mealId), [f.host, f.bob], [], true)
    expect(screen.queryByRole('button', { name: 'Bỏ Bình khỏi bữa' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tài khoản ngân hàng của Bình' })).toBeNull()
  })

  it('opens the bank account dialog of a participant', async () => {
    const f = await fixture()
    renderList(await currentMeal(f.mealId), [f.host, f.bob])
    await userEvent.click(screen.getByRole('button', { name: 'Tài khoản ngân hàng của Bình' }))
    expect(screen.getByRole('dialog', { name: 'Tài khoản ngân hàng — Bình' })).toBeTruthy()
  })
})
