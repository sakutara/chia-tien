import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealStatusView from './MealStatusView'
import type { Meal, MealSummary, MealStatus } from '../../types'

afterEach(cleanup)

function summary(id: string, title: string, status: MealStatus = 'ACTIVE'): MealSummary {
  const meal: Meal = {
    id,
    title,
    date: '2026-10-19',
    status,
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

const titlesIn = (panel: HTMLElement) =>
  within(panel)
    .queryAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)

describe('MealStatusView (BR-3.6, R-15)', () => {
  it('shows the first-run invitation when there are no meals at all', async () => {
    const onCreate = vi.fn()
    render(<MealStatusView summaries={[]} onOpen={() => {}} onDelete={() => {}} onCreate={onCreate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa đầu tiên' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('splits meals into Đang hoạt động and Đã lưu trữ tabs with their counts', async () => {
    render(
      <MealStatusView
        summaries={[summary('1', 'Lẩu'), summary('2', 'Cafe'), summary('3', 'Tất niên', 'ARCHIVED')]}
        onOpen={() => {}}
        onDelete={() => {}}
        onCreate={() => {}}
      />,
    )
    const panel = screen.getByRole('tabpanel')
    expect(titlesIn(panel)).toEqual(['Lẩu', 'Cafe'])

    await userEvent.click(screen.getByRole('tab', { name: 'Đã lưu trữ (1)' }))
    expect(titlesIn(panel)).toEqual(['Tất niên'])
    expect(screen.getByRole('tab', { name: 'Đã lưu trữ (1)' }).getAttribute('aria-selected')).toBe('true')
  })

  it('explains why the archive tab is empty', async () => {
    render(<MealStatusView summaries={[summary('1', 'Lẩu')]} onOpen={() => {}} onDelete={() => {}} onCreate={() => {}} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Đã lưu trữ (0)' }))
    expect(screen.getByRole('tabpanel').textContent).toContain('Bữa chỉ lưu trữ được khi mọi khoản thanh toán đã hoàn tất')
  })

  it('switches tabs with the left and right arrow keys', () => {
    render(<MealStatusView summaries={[summary('1', 'Lẩu'), summary('3', 'Tất niên', 'ARCHIVED')]} onOpen={() => {}} onDelete={() => {}} onCreate={() => {}} />)
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Loại bữa' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Đã lưu trữ (1)' }).getAttribute('aria-selected')).toBe('true')
    expect(titlesIn(screen.getByRole('tabpanel'))).toEqual(['Tất niên'])
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Đã lưu trữ (1)' }))
  })
})
