import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealInfo from './MealInfo'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { formatMoney } from '../../lib/money'
import { createMeal } from '../../services/mealService'
import { initMealPeople } from '../../services/mealPeopleService'
import type { MealPeopleView } from '../../hooks/useMealPeople'
import type { Meal, MealSummary, Member } from '../../types'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

async function fixture(patch: Partial<Meal> = {}): Promise<{ view: MealPeopleView; host: Member }> {
  const init = await initMealPeople()
  const meal = await createMeal({ title: 'Lẩu', date: '2026-10-19' })
  await db.meals.update(meal.id, patch)
  const saved = (await db.meals.get(meal.id)) as Meal
  const host = (await db.members.get(init.hostMemberId)) as Member
  return { view: { meal: saved, participants: [host], host, groups: [] }, host }
}

function summaryOf(meal: Meal, overrides: Partial<MealSummary> = {}): MealSummary {
  return { meal, sessionCount: 0, participantCount: 1, totalAmount: 0, hasCost: false, paidCount: 0, entityCount: 0, ...overrides }
}

describe('MealInfo — bước 1 (BR-3.2)', () => {
  it('shows the title, the date, the host and the placeholder for a missing note', async () => {
    const { view } = await fixture()
    render(<MealInfo view={view} summary={undefined} />)

    expect(screen.getByRole('button', { name: 'Lẩu' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '19/10/2026' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Người chủ trì' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thêm ghi chú' })).toBeTruthy()
    expect(screen.getByText('Chưa có chi phí')).toBeTruthy()
  })

  it('shows the total once the meal has a cost', async () => {
    const { view } = await fixture()
    render(<MealInfo view={view} summary={summaryOf(view.meal, { hasCost: true, totalAmount: 250_000 })} />)
    expect(screen.getByText(formatMoney(250_000))).toBeTruthy()
  })

  it('renames the meal in place and saves it to the meal', async () => {
    const { view } = await fixture()
    render(<MealInfo view={view} summary={undefined} />)

    await userEvent.click(screen.getByRole('button', { name: 'Lẩu' }))
    const input = screen.getByRole('textbox', { name: 'Tên bữa' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Lẩu tối{Enter}')

    await waitFor(async () => expect((await db.meals.get(view.meal.id))!.title).toBe('Lẩu tối'))
  })

  it('saves a new note typed into the note box', async () => {
    const { view } = await fixture()
    render(<MealInfo view={view} summary={undefined} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm ghi chú' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Ghi chú' }), 'mang theo bia')
    await userEvent.tab()

    await waitFor(async () => expect((await db.meals.get(view.meal.id))!.note).toBe('mang theo bia'))
  })

  it('is read-only for an archived meal: no editing controls, no host dropdown', async () => {
    const { view } = await fixture({ status: 'ARCHIVED' })
    render(<MealInfo view={view} summary={undefined} />)

    expect(screen.queryByRole('button', { name: 'Lẩu' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Người chủ trì' })).toBeNull()
    expect(screen.getByText('Lẩu')).toBeTruthy()
  })
})
