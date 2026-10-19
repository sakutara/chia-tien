import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealsPage from './MealsPage'
import { db } from '../db/db'
import { ensureDefaultData } from '../db/seed'
import { todayLocal } from '../lib/dates'
import { createMeal } from '../services/mealService'
import type { Meal } from '../types'

afterEach(cleanup)

beforeEach(async () => {
  window.localStorage.clear()
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

async function seed() {
  const a = await createMeal({ title: 'Lẩu cuối tuần', date: '2026-10-19' }, new Date(2026, 9, 19, 9))
  const b = await createMeal({ title: 'Cafe sáng', date: '2026-10-19' }, new Date(2026, 9, 19, 20))
  const c = await createMeal({ title: 'Tất niên', date: '2026-01-10' })
  await db.meals.update(c.id, { status: 'ARCHIVED' } as Partial<Meal>)
  return { a, b, c }
}

function titles(): string[] {
  return screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent ?? '')
}

describe('MealsPage — list view (AC-7)', () => {
  it('shows the first-run empty state and opens the create dialog (R-18)', async () => {
    const onOpen = vi.fn()
    render(<MealsPage onOpenMeal={onOpen} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo bữa đầu tiên' }))
    expect(screen.getByRole('dialog', { name: 'Tạo bữa mới' })).toBeTruthy()
  })

  it('orders newest date first, ties by newest creation, and fills each card', async () => {
    await seed()
    render(<MealsPage onOpenMeal={() => {}} />)
    await screen.findAllByRole('article')
    expect(titles()).toEqual(['Cafe sáng', 'Lẩu cuối tuần', 'Tất niên'])

    const first = screen.getAllByRole('article')[0]
    expect(first.textContent).toContain('19/10/2026')
    expect(within(first).getByText('Chưa có chi phí')).toBeTruthy()
        expect(within(first).queryByLabelText('Đã lưu trữ')).toBeNull()
    expect(within(screen.getAllByRole('article')[2]).getByLabelText('Đã lưu trữ')).toBeTruthy()
  })

  it('creates a meal, then opens it (AC-3, BR-3.1)', async () => {
    const onOpen = vi.fn()
    render(<MealsPage onOpenMeal={onOpen} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo bữa mới' }))
    await userEvent.type(screen.getByLabelText(/Tên bữa/), 'Đi ăn  tối')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa' }))

    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1))
    const saved = (await db.meals.toArray())[0]
    expect(saved).toMatchObject({ title: 'Đi ăn tối', date: todayLocal(), status: 'ACTIVE' })
    expect(onOpen).toHaveBeenCalledWith(saved.id)
  })

  it('shows field errors for an invalid date without creating anything (AC-3)', async () => {
    render(<MealsPage onOpenMeal={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo bữa mới' }))
    const date = screen.getByLabelText('Ngày diễn ra') as HTMLInputElement
    await userEvent.clear(date)
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Ngày không hợp lệ')
    expect(await db.meals.count()).toBe(0)
  })
})

describe('MealsPage — delete (AC-2, AC-12)', () => {
  it('asks first with Cancel focused, then deletes everywhere', async () => {
    const { a } = await seed()
    await db.sessions.put({ id: 's1', mealId: a.id, name: 'Kèo 1', orderIndex: 0, participantIds: [], createdAt: 'x' })
    render(<MealsPage onOpenMeal={() => {}} />)
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bữa: Lẩu cuối tuần' }))
    const dialog = await screen.findByRole('dialog', { name: 'Xoá bữa này?' })
    expect(dialog.textContent).toContain('1 kèo')
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Huỷ' }))

    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    expect(await db.meals.get(a.id)).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bữa: Lẩu cuối tuần' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xoá bữa' }))
    await waitFor(() => expect(titles()).toEqual(['Cafe sáng', 'Tất niên']))
    expect(await db.sessions.count()).toBe(0)
  })

  it('can delete an archived meal (AC-8)', async () => {
    await seed()
    render(<MealsPage onOpenMeal={() => {}} />)
    await screen.findAllByRole('article')
    await userEvent.click(screen.getByRole('button', { name: 'Xoá bữa: Tất niên' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xoá bữa' }))
    await waitFor(() => expect(titles()).toEqual(['Cafe sáng', 'Lẩu cuối tuần']))
  })
})

describe('MealsPage — switching views keeps the data consistent (AC-1, AC-8, AC-9)', () => {
  it('splits ACTIVE / ARCHIVED with counts and remembers the chosen view', async () => {
    await seed()
    const { unmount } = render(<MealsPage onOpenMeal={() => {}} />)
    await screen.findAllByRole('article')

    await userEvent.click(screen.getByRole('tab', { name: /Theo loại/ }))
    expect(screen.getByRole('tab', { name: 'Đang hoạt động (2)' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Đã lưu trữ (1)' })).toBeTruthy()
    expect(titles()).toEqual(['Cafe sáng', 'Lẩu cuối tuần'])

    await userEvent.click(screen.getByRole('tab', { name: 'Đã lưu trữ (1)' }))
    expect(titles()).toEqual(['Tất niên'])
    expect(screen.queryByRole('button', { name: /Sửa/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Xoá bữa: Tất niên' })).toBeTruthy()

    expect(window.localStorage.getItem('usd-split.mealView')).toBe('STATUS')
    unmount()

    // "F5": mở lại và vẫn ở chế độ Loại
    render(<MealsPage onOpenMeal={() => {}} />)
    expect(await screen.findByRole('tab', { name: 'Đang hoạt động (2)' })).toBeTruthy()
  })

  it('shows the explanatory empty text for an empty archive tab (R-15)', async () => {
    await createMeal({ title: 'Chỉ có bữa này', date: '2026-10-19' })
    window.localStorage.setItem('usd-split.mealView', 'STATUS')
    render(<MealsPage onOpenMeal={() => {}} />)
    await userEvent.click(await screen.findByRole('tab', { name: 'Đã lưu trữ (0)' }))
    expect(screen.getByRole('tabpanel').textContent).toContain('Bữa chỉ lưu trữ được khi mọi khoản thanh toán đã hoàn tất')
  })

  it('a meal created in one view appears in the others at once (AC-1)', async () => {
    await seed()
    render(<MealsPage onOpenMeal={() => {}} />)
    await screen.findAllByRole('article')
    const meal = await createMeal({ title: 'Bữa mới thêm', date: '2026-11-01' })
    await waitFor(() => expect(titles()[0]).toBe('Bữa mới thêm'))

    await userEvent.click(screen.getByRole('tab', { name: /Theo loại/ }))
    expect(titles()).toContain('Bữa mới thêm')

    await db.meals.update(meal.id, { title: 'Đã đổi tên' })
    await waitFor(() => expect(titles()).toContain('Đã đổi tên'))
  })
})

describe('MealsPage — calendar view (AC-6)', () => {
  beforeEach(() => window.localStorage.setItem('usd-split.mealView', 'CALENDAR'))

  it('lists the meals of the selected day and marks the day on the grid', async () => {
    const today = todayLocal()
    await createMeal({ title: 'Bữa hôm nay', date: today })
    await createMeal({ title: 'Bữa lưu trữ hôm nay', date: today }).then((m) =>
      db.meals.update(m.id, { status: 'ARCHIVED' } as Partial<Meal>),
    )
    render(<MealsPage onOpenMeal={() => {}} />)

    const cell = await screen.findByRole('button', { name: new RegExp(`2 bữa, hôm nay`) })
    expect(cell.getAttribute('data-ymd')).toBe(today)
    expect(cell.textContent).toContain('Bữa hôm nay')
    expect(titles().sort()).toEqual(['Bữa hôm nay', 'Bữa lưu trữ hôm nay'])
  })

  it('pre-fills the selected day when creating from the calendar (BR-3.4, R-13)', async () => {
    render(<MealsPage onOpenMeal={() => {}} />)
    const first = todayLocal().slice(0, 8) + '01'
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${first.split('-').reverse().join('/')}`) }))
    expect(screen.getByText('Chưa có bữa nào vào ngày này.')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa mới cho ngày này' }))
    expect((screen.getByLabelText('Ngày diễn ra') as HTMLInputElement).value).toBe(first)
  })

  it('navigates months and jumps back with "Hôm nay"', async () => {
    render(<MealsPage onOpenMeal={() => {}} />)
    const grid = await screen.findByRole('grid')
    const label = grid.getAttribute('aria-label')

    await userEvent.click(screen.getByRole('button', { name: 'Tháng sau' }))
    expect(screen.getByRole('grid').getAttribute('aria-label')).not.toBe(label)

    await userEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    expect(screen.getByRole('grid').getAttribute('aria-label')).toBe(label)
  })

  it('moves the selected day with the arrow keys', async () => {
    render(<MealsPage onOpenMeal={() => {}} />)
    const today = todayLocal()
    const cell = await screen.findByRole('button', { name: /hôm nay/ })
    cell.focus()
    await userEvent.keyboard('{ArrowRight}')
    const next = document.activeElement as HTMLElement
    expect(next.getAttribute('data-ymd')).not.toBe(today)
    expect(next.getAttribute('data-ymd')! > today).toBe(true)
  })
})
