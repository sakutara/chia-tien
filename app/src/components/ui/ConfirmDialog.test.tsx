import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from './ConfirmDialog'

afterEach(cleanup)

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const props = {
    open: true,
    title: 'Xoá?',
    message: 'Hành động này không hoàn tác.',
    confirmLabel: 'Xoá',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  render(<ConfirmDialog {...props} />)
  return props
}

describe('ConfirmDialog (extra behaviour)', () => {
  it('shows the title and message inside a dialog named by the title', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: 'Xoá?' })
    expect(dialog.textContent).toContain('Hành động này không hoàn tác.')
  })

  it('treats Escape as cancel and does not confirm', () => {
    const { onCancel, onConfirm } = setup()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('disables both buttons while the confirm action is still running', async () => {
    let finish!: () => void
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    setup({ onConfirm })

    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
    expect((screen.getByRole('button', { name: 'Xoá' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Huỷ' }) as HTMLButtonElement).disabled).toBe(true)

    finish()
    await waitFor(() => expect((screen.getByRole('button', { name: 'Xoá' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('uses a generic message when the failure is not an Error, and clears it when cancelled', async () => {
    const onConfirm = vi.fn().mockRejectedValue('lỗi lạ')
    setup({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Có lỗi không xác định.')

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
