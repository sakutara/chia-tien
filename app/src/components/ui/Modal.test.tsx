import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'

afterEach(cleanup)

describe('Modal', () => {
  it('renders nothing while closed and a labelled dialog while open', () => {
    const { rerender } = render(
      <Modal open={false} title="Tiêu đề" onClose={() => {}}>
        nội dung
      </Modal>,
    )
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()

    rerender(
      <Modal open title="Tiêu đề" onClose={() => {}}>
        nội dung
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Tiêu đề' }).textContent).toContain('nội dung')
  })

  it('calls onClose on Escape (cancel event) and on the close button (AC-12)', async () => {
    const onClose = vi.fn()
    render(
      <Modal open title="T" onClose={onClose}>
        x
      </Modal>,
    )
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('returns focus to the opener when it closes', () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <>
          <button>mở</button>
          <Modal open={open} title="T" onClose={() => {}}>
            <button>trong</button>
          </Modal>
        </>
      )
    }
    const { rerender } = render(<Harness open={false} />)
    const opener = screen.getByRole('button', { name: 'mở' })
    opener.focus()
    rerender(<Harness open />)
    rerender(<Harness open={false} />)
    expect(document.activeElement).toBe(opener)
  })
})

describe('ConfirmDialog', () => {
  it('focuses Cancel by default (R-7, AC-12)', () => {
    render(
      <ConfirmDialog open title="Xoá?" message="Chắc không?" confirmLabel="Xoá" tone="danger" onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Huỷ' }))
  })

  it('runs onConfirm and shows its error without closing', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('Không xoá được'))
    const onCancel = vi.fn()
    render(<ConfirmDialog open title="Xoá?" message="m" confirmLabel="Xoá" onConfirm={onConfirm} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect((await screen.findByRole('alert')).textContent).toBe('Không xoá được')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('cancels without confirming', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog open title="Xoá?" message="m" confirmLabel="Xoá" onConfirm={onConfirm} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
