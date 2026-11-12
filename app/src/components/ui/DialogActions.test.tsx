import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FormEvent } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DialogActions from './DialogActions'

afterEach(cleanup)

describe('DialogActions', () => {
  it('calls onCancel and onSave from its two icon buttons', async () => {
    const onCancel = vi.fn()
    const onSave = vi.fn()
    render(<DialogActions onCancel={onCancel} onSave={onSave} saveLabel="Lưu hoá đơn" />)

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Lưu hoá đơn' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('uses a custom cancel label when given', () => {
    render(<DialogActions onCancel={() => {}} saveLabel="Lưu" cancelLabel="Bỏ qua" />)
    expect(screen.getByRole('button', { name: 'Bỏ qua' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Huỷ' })).toBeNull()
  })

  it('submits the enclosing form when there is no onSave handler', async () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <DialogActions onCancel={() => {}} saveLabel="Tạo bữa" />
      </form>,
    )
    expect((screen.getByRole('button', { name: 'Tạo bữa' }) as HTMLButtonElement).type).toBe('submit')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo bữa' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('disables saving while saving or when saveDisabled is set, but keeps cancel usable', () => {
    const { rerender } = render(<DialogActions onCancel={() => {}} saveLabel="Lưu" saving />)
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Huỷ' }) as HTMLButtonElement).disabled).toBe(false)

    rerender(<DialogActions onCancel={() => {}} saveLabel="Lưu" saveDisabled />)
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(true)

    rerender(<DialogActions onCancel={() => {}} saveLabel="Lưu" />)
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
