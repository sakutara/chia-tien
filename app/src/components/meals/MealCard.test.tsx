import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealCard from './MealCard'
import { formatMoney } from '../../lib/money'
import type { Meal, MealSummary } from '../../types'

afterEach(cleanup)

const meal: Meal = {
  id: 'm1',
  title: 'Lẩu cuối tuần',
  date: '2026-10-19',
  status: 'ACTIVE',
  participantIds: ['a', 'b'],
  hostMemberId: 'a',
  settlementMode: 'SELF_SETTLEMENT',
  paymentGroups: [],
  settlementStatuses: {},
  createdAt: '2026-10-19T00:00:00.000Z',
  updatedAt: '2026-10-19T00:00:00.000Z',
}

function summary(overrides: Partial<MealSummary> = {}, mealOverrides: Partial<Meal> = {}): MealSummary {
  return {
    meal: { ...meal, ...mealOverrides },
    sessionCount: 2,
    participantCount: 2,
    totalAmount: 0,
    hasCost: false,
    paidCount: 0,
    entityCount: 0,
    ...overrides,
  }
}

describe('MealCard', () => {
  it('shows the date, the counts and "Chưa có chi phí" when there is no cost yet', () => {
    render(<MealCard summary={summary()} onOpen={() => {}} onDelete={() => {}} />)
    const card = screen.getByRole('article')
    expect(card.textContent).toContain('19/10/2026')
    expect(within(card).getByText('Chưa có chi phí')).toBeTruthy()
    expect(card.textContent).not.toContain('đã trả')
  })

  it('shows the total and payment progress once there is a cost', () => {
    render(<MealCard summary={summary({ hasCost: true, totalAmount: 120_000, paidCount: 1, entityCount: 3 })} onOpen={() => {}} onDelete={() => {}} />)
    const card = screen.getByRole('article')
    expect(within(card).getByText(formatMoney(120_000))).toBeTruthy()
    expect(within(card).getByText('1/3 đã trả')).toBeTruthy()
  })

  it('opens the meal from its title or its arrow button, and asks to delete it from the bin button', async () => {
    const onOpen = vi.fn()
    const onDelete = vi.fn()
    render(<MealCard summary={summary()} onOpen={onOpen} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Mở chi tiết: Lẩu cuối tuần' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mở: Lẩu cuối tuần' }))
    expect(onOpen).toHaveBeenNthCalledWith(1, 'm1')
    expect(onOpen).toHaveBeenNthCalledWith(2, 'm1')

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bữa: Lẩu cuối tuần' }))
    expect(onDelete).toHaveBeenCalledWith('m1')
    expect(onOpen).toHaveBeenCalledTimes(2)
  })

  it('marks an archived meal with a lock, and does not for an active one', () => {
    const { rerender } = render(<MealCard summary={summary()} onOpen={() => {}} onDelete={() => {}} />)
    expect(screen.queryByLabelText('Đã lưu trữ')).toBeNull()

    rerender(<MealCard summary={summary({}, { status: 'ARCHIVED' })} onOpen={() => {}} onDelete={() => {}} />)
    expect(screen.getByLabelText('Đã lưu trữ')).toBeTruthy()
  })

  it('hides the date line when the card already sits under a date heading', () => {
    render(<MealCard summary={summary()} onOpen={() => {}} onDelete={() => {}} hideDate />)
    expect(screen.getByRole('article').textContent).not.toContain('19/10/2026')
  })
})
