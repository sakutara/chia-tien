import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InlineText from './InlineText'
import { PeopleError } from '../../services/peopleErrors'

afterEach(cleanup)

describe('InlineText', () => {
  it('turns into an input on click and saves the new value on Enter', async () => {
    const onCommit = vi.fn()
    render(<InlineText label="Tên bữa" value="Lẩu" onCommit={onCommit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Lẩu' }))

    const input = screen.getByRole('textbox', { name: 'Tên bữa' }) as HTMLInputElement
    expect(document.activeElement).toBe(input)
    await userEvent.clear(input)
    await userEvent.type(input, 'Nướng{Enter}')

    await waitFor(() => expect(onCommit).toHaveBeenCalledWith('Nướng'))
    expect(screen.getByRole('button', { name: 'Lẩu' })).toBeTruthy()
  })

  it('discards the draft on Escape without saving', async () => {
    const onCommit = vi.fn()
    render(<InlineText label="Tên bữa" value="Lẩu" onCommit={onCommit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Lẩu' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên bữa' }), ' thêm{Escape}')

    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Lẩu' })).toBeTruthy()
  })

  it('does not save when the value is unchanged and the field loses focus', async () => {
    const onCommit = vi.fn()
    render(
      <>
        <InlineText label="Ghi chú" value="cũ" onCommit={onCommit} />
        <button type="button">khác</button>
      </>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'cũ' }))
    await userEvent.click(screen.getByRole('button', { name: 'khác' }))
    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'cũ' })).toBeTruthy()
  })

  it('keeps editing and shows the PeopleError message when the save is refused', async () => {
    const onCommit = vi.fn().mockRejectedValue(new PeopleError('INVALID_NAME', 'Tên không hợp lệ'))
    render(<InlineText label="Tên" value="An" onCommit={onCommit} />)
    await userEvent.click(screen.getByRole('button', { name: 'An' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), 'x{Enter}')

    expect((await screen.findByRole('alert')).textContent).toBe('Tên không hợp lệ')
    expect(screen.getByRole('textbox', { name: 'Tên' })).toBeTruthy()
  })

  it('shows a generic error for other failures', async () => {
    const onCommit = vi.fn().mockRejectedValue(new Error('hỏng'))
    render(<InlineText label="Tên" value="An" onCommit={onCommit} />)
    await userEvent.click(screen.getByRole('button', { name: 'An' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), 'x{Enter}')
    expect((await screen.findByRole('alert')).textContent).toBe('Có lỗi không xác định.')
  })

  it('in multiline mode, Shift+Enter inserts a line break instead of saving', async () => {
    const onCommit = vi.fn()
    render(<InlineText label="Ghi chú" value="a" multiline onCommit={onCommit} />)
    await userEvent.click(screen.getByRole('button', { name: 'a' }))
    const area = screen.getByRole('textbox', { name: 'Ghi chú' })
    await userEvent.type(area, 'b{Shift>}{Enter}{/Shift}c')
    expect(onCommit).not.toHaveBeenCalled()
    expect((area as HTMLTextAreaElement).value).toBe('ab\nc')
  })

  it('is plain text when read-only, and shows the empty hint when there is no value', () => {
    const { rerender } = render(<InlineText label="Ghi chú" value="" empty="Thêm ghi chú" readOnly onCommit={() => {}} />)
    expect(screen.getByText('Thêm ghi chú')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()

    rerender(<InlineText label="Ngày" value="2026-10-19" display={(v) => v.split('-').reverse().join('/')} readOnly onCommit={() => {}} />)
    expect(screen.getByText('19/10/2026')).toBeTruthy()
  })
})
