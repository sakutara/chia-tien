import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealViewSwitcher from './MealViewSwitcher'

afterEach(cleanup)

describe('MealViewSwitcher (BR-3.7)', () => {
  it('shows the three views and marks the current one as selected', () => {
    render(<MealViewSwitcher mode="LIST" onChange={() => {}} />)
    expect(screen.getByRole('tablist', { name: 'Chế độ xem bữa' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Lịch' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: 'Danh sách' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'Theo loại' }).getAttribute('aria-selected')).toBe('false')
  })

  it('asks for the view that was clicked', async () => {
    const onChange = vi.fn()
    render(<MealViewSwitcher mode="CALENDAR" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Theo loại' }))
    expect(onChange).toHaveBeenCalledWith('STATUS')
  })

  it('changes view with the arrow keys, wrapping at both ends, and moves focus to the new tab', () => {
    const onChange = vi.fn()
    render(<MealViewSwitcher mode="CALENDAR" onChange={onChange} />)
    const tablist = screen.getByRole('tablist', { name: 'Chế độ xem bữa' })

    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('LIST')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Danh sách' }))

    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('STATUS')
  })

  it('ignores other keys', () => {
    const onChange = vi.fn()
    render(<MealViewSwitcher mode="CALENDAR" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })
})
