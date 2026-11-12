import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Trash2 } from 'lucide-react'
import IconButton from './IconButton'

afterEach(cleanup)

describe('IconButton', () => {
  it('is named by its label and exposes the same text as a tooltip', () => {
    render(<IconButton icon={Trash2} label="Xoá bữa" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Xoá bữa' })
    expect(button.getAttribute('title')).toBe('Xoá bữa')
  })

  it('calls onClick when pressed and defaults to a non-submitting button', async () => {
    const onClick = vi.fn()
    render(
      <form onSubmit={(e) => e.preventDefault()}>
        <IconButton icon={Trash2} label="Mở" onClick={onClick} />
      </form>,
    )
    const button = screen.getByRole('button', { name: 'Mở' }) as HTMLButtonElement
    expect(button.type).toBe('button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('becomes a submit button when asked, and ignores clicks while disabled', async () => {
    const onClick = vi.fn()
    const { rerender } = render(<IconButton icon={Trash2} label="Lưu" type="submit" onClick={onClick} disabled />)
    const button = screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement
    expect(button.type).toBe('submit')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()

    rerender(<IconButton icon={Trash2} label="Lưu" type="submit" onClick={onClick} />)
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
