import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArchiveMealDialog from './ArchiveMealDialog'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { createInvoice } from '../../services/invoiceService'
import { initMealPeople } from '../../services/mealPeopleService'
import { addSession } from '../../services/sessionService'
import { payAllTransfers } from '../../services/settlementTestUtils'
import { createMeal } from '../../services/mealService'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

/** Bữa có một kèo, một hoá đơn và đủ người (chưa tick thanh toán). */
async function billedMeal() {
  const init = await initMealPeople()
  const now = new Date().toISOString()
  await db.members.put({ id: 'bob', name: 'Bình', normalizedName: 'binh', avatarColor: '#2D6A4F', createdAt: now, lastUsedAt: now })
  const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
  await db.meals.update(meal.id, { participantIds: [init.hostMemberId, 'bob'] })
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
  return meal
}

describe('ArchiveMealDialog (BR-7.2)', () => {
  it('states what will be deleted and what is kept, with Cancel focused by default', async () => {
    const meal = await billedMeal()
    render(<ArchiveMealDialog mealId={meal.id} mealTitle="Lẩu" onClose={() => {}} onArchived={() => {}} />)

    const dialog = screen.getByRole('dialog', { name: 'Lưu trữ bữa?' })
    expect(await within(dialog).findByText(/1 hoá đơn cùng 0 file ảnh/)).toBeTruthy()
    expect(dialog.textContent).toContain('Vẫn giữ lại chi phí từng kèo')
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Huỷ' }))
  })

  it('closes without archiving when cancelled', async () => {
    const meal = await billedMeal()
    const onClose = vi.fn()
    const onArchived = vi.fn()
    render(<ArchiveMealDialog mealId={meal.id} mealTitle="Lẩu" onClose={onClose} onArchived={onArchived} />)

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onArchived).not.toHaveBeenCalled()
    expect((await db.meals.get(meal.id))!.status).toBe('ACTIVE')
  })

  it('shows the refusal inside the dialog when some payments are still unticked', async () => {
    const meal = await billedMeal()
    const onArchived = vi.fn()
    render(<ArchiveMealDialog mealId={meal.id} mealTitle="Lẩu" onClose={() => {}} onArchived={onArchived} />)

    await userEvent.click(screen.getByRole('button', { name: 'Lưu trữ bữa' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(onArchived).not.toHaveBeenCalled()
    expect((await db.meals.get(meal.id))!.status).toBe('ACTIVE')
  })

  it('archives the meal and reports it once every payment is ticked', async () => {
    const meal = await billedMeal()
    await payAllTransfers(meal.id)
    const onArchived = vi.fn()
    render(<ArchiveMealDialog mealId={meal.id} mealTitle="Lẩu" onClose={() => {}} onArchived={onArchived} />)

    await userEvent.click(screen.getByRole('button', { name: 'Lưu trữ bữa' }))
    await waitFor(() => expect(onArchived).toHaveBeenCalledTimes(1))
    expect((await db.meals.get(meal.id))!.status).toBe('ARCHIVED')
  })
})
