import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ToggleButton from './ToggleButton'

afterEach(cleanup)

describe('ToggleButton', () => {
  it('shows the label of the state it will switch to and asks for the opposite value', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ToggleButton checked={false} label="Bật" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Bật' }))
    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(<ToggleButton checked label="Bật" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Bật' }))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('uses uncheckedLabel for the checked state when given', () => {
    render(<ToggleButton checked label="EN" uncheckedLabel="VI" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'VI' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'EN' })).toBeNull()
  })

  it('keeps the same label in both states when uncheckedLabel is absent', () => {
    const { rerender } = render(<ToggleButton checked={false} label="Ghim" onChange={() => {}} />)
    expect(screen.getByRole('button').textContent).toBe('Ghim')
    rerender(<ToggleButton checked label="Ghim" onChange={() => {}} />)
    expect(screen.getByRole('button').textContent).toBe('Ghim')
  })

  it('does nothing when disabled', async () => {
    const onChange = vi.fn()
    render(<ToggleButton checked={false} label="Bật" disabled onChange={onChange} />)
    const button = screen.getByRole('button', { name: 'Bật' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    await userEvent.click(button)
    expect(onChange).not.toHaveBeenCalled()
  })
})
