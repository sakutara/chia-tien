import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Switch from './Switch'

afterEach(cleanup)

describe('Switch', () => {
  it('is a labelled switch that reports its state', () => {
    render(<Switch checked label="Nhận thông báo" onChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Nhận thông báo' })
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('asks for the opposite state when clicked', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<Switch checked={false} label="Bật" onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Bật' }))
    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(<Switch checked label="Bật" onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Bật' }))
    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('ignores clicks while disabled', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} label="Bật" disabled onChange={onChange} />)
    const sw = screen.getByRole('switch', { name: 'Bật' }) as HTMLButtonElement
    expect(sw.disabled).toBe(true)
    await userEvent.click(sw)
    expect(onChange).not.toHaveBeenCalled()
  })
})
