import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Collapse from './Collapse'

afterEach(cleanup)

describe('Collapse', () => {
  it('starts closed and shows its content only after the title is pressed', async () => {
    render(
      <Collapse title="Chi tiết kèo">
        <p>nội dung ẩn</p>
      </Collapse>,
    )
    const toggle = screen.getByRole('button', { name: 'Chi tiết kèo' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('nội dung ẩn')).toBeNull()

    await userEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('nội dung ẩn')).toBeTruthy()

    await userEvent.click(toggle)
    expect(screen.queryByText('nội dung ẩn')).toBeNull()
  })

  it('is open from the start when defaultOpen is set', () => {
    render(
      <Collapse title="Mở sẵn" defaultOpen>
        <p>đã thấy</p>
      </Collapse>,
    )
    expect(screen.getByRole('button', { name: 'Mở sẵn' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('đã thấy')).toBeTruthy()
  })

  it('uses the explicit label as the accessible name instead of the title', () => {
    render(
      <Collapse title={<strong>Ghi chú</strong>} label="Mở ghi chú">
        <p>x</p>
      </Collapse>,
    )
    expect(screen.getByRole('button', { name: 'Mở ghi chú' })).toBeTruthy()
    expect(screen.getByText('Ghi chú')).toBeTruthy()
  })
})
