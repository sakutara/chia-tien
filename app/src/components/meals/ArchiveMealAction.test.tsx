import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { createInvoice } from '../../services/invoiceService'
import { initMealPeople } from '../../services/mealPeopleService'
import { addSession } from '../../services/sessionService'
import { payAllTransfers } from '../../services/settlementTestUtils'
import type { Meal } from '../../types'
import ArchiveMealAction from './ArchiveMealAction'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

async function fixture(): Promise<{ meal: Meal; host: string; bob: string }> {
  const init = await initMealPeople()
  const now = new Date().toISOString()
  await db.members.put({ id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
  const meal: Meal = {
    id: crypto.randomUUID(), title: 'Lẩu', date: '2026-10-19', status: 'ACTIVE',
    participantIds: [init.hostMemberId, 'bob'], hostMemberId: init.hostMemberId,
    settlementMode: 'SELF_SETTLEMENT', paymentGroups: [], settlementStatuses: {}, createdAt: now, updatedAt: now,
  }
  await db.meals.put(meal)
  const session = await addSession(meal.id, 'Kèo 1')
  await createInvoice({
    sessionId: session.id, payerMemberId: init.hostMemberId, inputMode: 'TOTAL_ONLY', items: [],
    subtotalAmount: 90_000, discount: { mode: 'NONE', value: 0 }, service: { mode: 'NONE', value: 0 }, vat: { mode: 'NONE', value: 0 },
  })
  return { meal, host: init.hostMemberId, bob: 'bob' }
}

describe('ArchiveMealAction (Epic 7: BR-7.1, BR-7.2, AC-1, AC-4)', () => {
  it('khoá nút và nêu tên người chưa thanh toán', async () => {
    const f = await fixture()
    render(<ArchiveMealAction mealId={f.meal.id} mealTitle={f.meal.title} readOnly={false} />)
    const button = await screen.findByRole('button', { name: 'Lưu trữ bữa' })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/Chưa tick đã chuyển: .*Bình/)).toBeTruthy()
  })

  it('sau khi tick đủ, xác nhận lưu trữ: Huỷ là mặc định, bấm Lưu trữ thì bữa bị khoá', async () => {
    const f = await fixture()
    await payAllTransfers(f.meal.id)
    render(<ArchiveMealAction mealId={f.meal.id} mealTitle={f.meal.title} readOnly={false} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Lưu trữ bữa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Lưu trữ bữa?' })
    expect(await within(dialog).findByText(/1 hoá đơn/)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Huỷ' }).isEqualNode(document.activeElement)).toBe(true)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu trữ bữa' }))
    await waitFor(async () => expect((await db.meals.get(f.meal.id))!.status).toBe('ARCHIVED'))
    expect(await db.invoices.where('mealId').equals(f.meal.id).count()).toBe(0)
  })
})
