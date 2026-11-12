import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteMealDialog from './DeleteMealDialog'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { createMeal } from '../../services/mealService'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

describe('DeleteMealDialog (BR-3.3, R-7)', () => {
  it('names the meal and its date, and warns that deleting cannot be undone', async () => {
    const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
    render(<DeleteMealDialog mealId={meal.id} title="Lẩu" date="2026-10-19" onClose={() => {}} onDeleted={() => {}} />)

    const dialog = screen.getByRole('dialog', { name: 'Xoá bữa này?' })
    expect(dialog.textContent).toContain('Lẩu (19/10/2026)')
    expect(dialog.textContent).toContain('Không thể hoàn tác')
    // Bữa trống không mất gì thêm
    await waitFor(() => expect(dialog.textContent).not.toContain('Sẽ mất kèm theo'))
  })

  it('lists what will be lost with it, once the preview has loaded', async () => {
    const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
    await db.sessions.put({ id: 's1', mealId: meal.id, name: 'Kèo 1', orderIndex: 0, participantIds: [], createdAt: 'x' })
    await db.sessions.put({ id: 's2', mealId: meal.id, name: 'Kèo 2', orderIndex: 1, participantIds: [], createdAt: 'x' })
    render(<DeleteMealDialog mealId={meal.id} title="Lẩu" date="2026-10-19" onClose={() => {}} onDeleted={() => {}} />)

    expect(await screen.findByText(/Sẽ mất kèm theo: 2 kèo\./)).toBeTruthy()
  })

  it('cancels without deleting, and Cancel is the focused default', async () => {
    const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
    const onClose = vi.fn()
    const onDeleted = vi.fn()
    render(<DeleteMealDialog mealId={meal.id} title="Lẩu" date="2026-10-19" onClose={onClose} onDeleted={onDeleted} />)

    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onDeleted).not.toHaveBeenCalled()
    expect(await db.meals.get(meal.id)).toBeTruthy()
  })

  it('deletes the meal and reports it when confirmed', async () => {
    const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
    const onDeleted = vi.fn()
    render(<DeleteMealDialog mealId={meal.id} title="Lẩu" date="2026-10-19" onClose={() => {}} onDeleted={onDeleted} />)

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bữa' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(await db.meals.get(meal.id)).toBeUndefined()
  })
})
