import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Popover from './Popover'

afterEach(cleanup)

describe('Popover', () => {
  it('opens its panel on click and names the trigger with the current summary', async () => {
    render(
      <Popover label="Số lượng" trigger="2" summary="2 phần">
        <p>nội dung khung</p>
      </Popover>,
    )
    const trigger = screen.getByRole('button', { name: 'Số lượng: 2 phần' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Số lượng' }).textContent).toContain('nội dung khung')
  })

  it('closes on Escape and when the user presses outside, but not when pressing inside', async () => {
    render(
      <>
        <span>bên ngoài</span>
        <Popover label="Ghi chú" trigger="x">
          <input aria-label="ô bên trong" />
        </Popover>
      </>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ghi chú' }))
    await userEvent.click(screen.getByLabelText('ô bên trong'))
    expect(screen.getByRole('dialog')).toBeTruthy()

    await userEvent.click(screen.getByText('bên ngoài'))
    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Ghi chú' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('passes a close function to render-prop children so a save can dismiss the panel', async () => {
    const onSave = vi.fn()
    render(
      <Popover label="Sửa" trigger="giá">
        {(close) => (
          <button
            type="button"
            onClick={() => {
              onSave()
              close()
            }}
          >
            Lưu
          </button>
        )}
      </Popover>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('cannot be opened while disabled', async () => {
    render(
      <Popover label="Khoá" trigger="x" disabled>
        <p>ẩn</p>
      </Popover>,
    )
    const trigger = screen.getByRole('button', { name: 'Khoá' }) as HTMLButtonElement
    expect(trigger.disabled).toBe(true)
    await userEvent.click(trigger)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
