import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealListView from './MealListView'
import type { Meal, MealSummary } from '../../types'

afterEach(cleanup)

function summary(id: string, title: string): MealSummary {
  const meal: Meal = {
    id,
    title,
    date: '2026-10-19',
    status: 'ACTIVE',
    participantIds: [],
    hostMemberId: 'h',
    settlementMode: 'SELF_SETTLEMENT',
    paymentGroups: [],
    settlementStatuses: {},
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
  }
  return { meal, sessionCount: 1, participantCount: 1, totalAmount: 0, hasCost: false, paidCount: 0, entityCount: 0 }
}

describe('MealListView (BR-3.5, R-8, R-18)', () => {
  it('invites the first meal when there is none', async () => {
    const onCreate = vi.fn()
    render(<MealListView summaries={[]} onOpen={() => {}} onDelete={() => {}} onCreate={onCreate} />)
    expect(screen.getByRole('heading', { name: 'Chưa có bữa nào' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa đầu tiên' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('lists the meals in the order given, one card per meal', () => {
    render(<MealListView summaries={[summary('m2', 'Mới'), summary('m1', 'Cũ')]} onOpen={() => {}} onDelete={() => {}} onCreate={() => {}} />)
    const list = screen.getByRole('list', { name: 'Danh sách bữa' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => within(li).getByRole('heading', { level: 3 }).textContent)).toEqual(['Mới', 'Cũ'])
  })

  it('passes open and delete requests of a card up with the meal id', async () => {
    const onOpen = vi.fn()
    const onDelete = vi.fn()
    render(<MealListView summaries={[summary('m1', 'Lẩu')]} onOpen={onOpen} onDelete={onDelete} onCreate={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Mở chi tiết: Lẩu' }))
    expect(onOpen).toHaveBeenCalledWith('m1')

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bữa: Lẩu' }))
    expect(onDelete).toHaveBeenCalledWith('m1')
  })
})
