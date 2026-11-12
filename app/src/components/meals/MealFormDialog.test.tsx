import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealFormDialog from './MealFormDialog'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { createMeal } from '../../services/mealService'
import type { Meal } from '../../types'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

describe('MealFormDialog — tạo bữa (BR-3.1, R-1…R-3)', () => {
  it('opens on the given date and, with an empty title, saves the default "Bữa <ngày>" name', async () => {
    const onSaved = vi.fn()
    render(<MealFormDialog mode="create" initialDate="2026-10-19" onClose={() => {}} onSaved={onSaved} />)

    expect(screen.getByRole('dialog', { name: 'Tạo bữa mới' })).toBeTruthy()
    expect((screen.getByLabelText('Ngày diễn ra') as HTMLInputElement).value).toBe('2026-10-19')
    expect((screen.getByLabelText(/Tên bữa/) as HTMLInputElement).placeholder).toBe('Bữa 19/10/2026')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    const saved: Meal = onSaved.mock.calls[0][0]
    expect(saved).toMatchObject({ title: 'Bữa 19/10/2026', date: '2026-10-19', status: 'ACTIVE' })
    expect(await db.meals.get(saved.id)).toBeTruthy()
  })

  it('shows the date error next to the field and creates nothing when the date is cleared', async () => {
    const onSaved = vi.fn()
    render(<MealFormDialog mode="create" initialDate="2026-10-19" onClose={() => {}} onSaved={onSaved} />)
    const date = screen.getByLabelText('Ngày diễn ra') as HTMLInputElement
    await userEvent.clear(date)
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Ngày không hợp lệ')
    expect(date.getAttribute('aria-invalid')).toBe('true')
    expect(onSaved).not.toHaveBeenCalled()
    expect(await db.meals.count()).toBe(0)
  })

  it('refuses a title longer than 100 characters next to the title field', async () => {
    const onSaved = vi.fn()
    render(<MealFormDialog mode="create" initialDate="2026-10-19" onClose={() => {}} onSaved={onSaved} />)
    await userEvent.type(screen.getByLabelText(/Tên bữa/), 'a'.repeat(101))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Tên bữa tối đa 100 ký tự.')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('counts the note characters and calls onClose from the cancel button', async () => {
    const onClose = vi.fn()
    render(<MealFormDialog mode="create" initialDate="2026-10-19" onClose={onClose} onSaved={() => {}} />)
    await userEvent.type(screen.getByLabelText('Ghi chú'), 'đồ nướng')
    expect(screen.getByText('8/500')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('MealFormDialog — sửa thông tin bữa (BR-3.2)', () => {
  it('starts with the meal values and saves the changes', async () => {
    const meal = await createMeal({ title: 'Cafe', date: '2026-10-19', note: 'ghi cũ' })
    const onSaved = vi.fn()
    render(<MealFormDialog mode="edit" meal={meal} onClose={() => {}} onSaved={onSaved} />)

    expect(screen.getByRole('dialog', { name: 'Sửa thông tin bữa' })).toBeTruthy()
    expect((screen.getByLabelText(/Tên bữa/) as HTMLInputElement).value).toBe('Cafe')
    expect((screen.getByLabelText('Ghi chú') as HTMLTextAreaElement).value).toBe('ghi cũ')

    await userEvent.clear(screen.getByLabelText(/Tên bữa/))
    await userEvent.type(screen.getByLabelText(/Tên bữa/), 'Cafe sáng')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(onSaved.mock.calls[0][0]).toMatchObject({ id: meal.id, title: 'Cafe sáng', note: 'ghi cũ' })
    expect((await db.meals.get(meal.id))!.title).toBe('Cafe sáng')
  })
})
