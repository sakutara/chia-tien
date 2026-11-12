import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealCalendarView from './MealCalendarView'
import type { Meal, MealSummary } from '../../types'

afterEach(cleanup)

function summary(id: string, title: string, date: string): MealSummary {
  const meal: Meal = {
    id,
    title,
    date,
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

/** Mở đúng tháng 10/2026 để test không phụ thuộc ngày chạy thật. */
async function gotoOctober2026() {
  await userEvent.selectOptions(screen.getByLabelText('Tháng'), '10')
  await userEvent.selectOptions(screen.getByLabelText('Năm'), '2026')
}

const dayCell = (ymd: string) => document.querySelector<HTMLElement>(`[data-ymd="${ymd}"]`)!

describe('MealCalendarView (BR-3.4, R-12…R-14)', () => {
  it('shows the meals of the selected day with their cost, and a note for an empty day', async () => {
    const summaries = [summary('1', 'Lẩu', '2026-10-19'), summary('2', 'Cafe', '2026-10-19')]
    render(<MealCalendarView summaries={summaries} onCreateForDate={() => {}} onOpen={() => {}} onDelete={() => {}} />)
    await gotoOctober2026()

    await userEvent.click(dayCell('2026-10-19'))
    const section = screen.getByRole('region', { name: 'Bữa ngày 19/10/2026' })
    expect(within(section).getByRole('heading', { name: 'Ngày 19/10/2026' })).toBeTruthy()
    expect(within(section).getAllByRole('article')).toHaveLength(2)

    await userEvent.click(dayCell('2026-10-20'))
    expect(screen.getByText('Chưa có bữa nào vào ngày này.')).toBeTruthy()
  })

  it('announces how many meals a day has in its label', async () => {
    render(
      <MealCalendarView
        summaries={[summary('1', 'Lẩu', '2026-10-19'), summary('2', 'Cafe', '2026-10-19')]}
        onCreateForDate={() => {}}
        onOpen={() => {}}
        onDelete={() => {}}
      />,
    )
    await gotoOctober2026()
    expect(screen.getByRole('button', { name: '19/10/2026, 2 bữa' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '20/10/2026' })).toBeTruthy()
  })

  it('creates a meal on the selected day from the + button', async () => {
    const onCreateForDate = vi.fn()
    render(<MealCalendarView summaries={[]} onCreateForDate={onCreateForDate} onOpen={() => {}} onDelete={() => {}} />)
    await gotoOctober2026()
    await userEvent.click(dayCell('2026-10-07'))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa mới cho ngày này' }))
    expect(onCreateForDate).toHaveBeenCalledWith('2026-10-07')
  })

  it('moves the selection with the arrow keys, one day or one week at a time', async () => {
    render(<MealCalendarView summaries={[]} onCreateForDate={() => {}} onOpen={() => {}} onDelete={() => {}} />)
    await gotoOctober2026()
    await userEvent.click(dayCell('2026-10-19'))

    const grid = screen.getByRole('grid')
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Ngày 20/10/2026' })).toBeTruthy()

    fireEvent.keyDown(grid, { key: 'ArrowDown' })
    expect(screen.getByRole('heading', { name: 'Ngày 27/10/2026' })).toBeTruthy()
    expect(document.activeElement).toBe(dayCell('2026-10-27'))
  })

  it('keeps the selected day when moving to the next month only if it is still in the grid', async () => {
    render(<MealCalendarView summaries={[]} onCreateForDate={() => {}} onOpen={() => {}} onDelete={() => {}} />)
    await gotoOctober2026()
    await userEvent.click(dayCell('2026-10-19'))

    await userEvent.click(screen.getByRole('button', { name: 'Tháng sau' }))
    expect((screen.getByLabelText('Tháng') as HTMLSelectElement).value).toBe('11')
    // 19/10 không nằm trong lưới tháng 11 nên chọn ngày 1 của tháng mới
    expect(screen.getByRole('heading', { name: 'Ngày 01/11/2026' })).toBeTruthy()
  })
})
