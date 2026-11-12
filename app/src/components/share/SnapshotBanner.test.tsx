import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SnapshotBanner from './SnapshotBanner'

afterEach(cleanup)

describe('SnapshotBanner (BR-8.3)', () => {
  it('hiện tên bữa được chia sẻ và nhận diện là chế độ xem Snapshot', () => {
    render(<SnapshotBanner title="Lẩu cuối tuần" onExit={() => {}} />)
    expect(screen.getByRole('status', { name: 'Chế độ xem Snapshot' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Lẩu cuối tuần' })).toBeTruthy()
  })

  it('bấm icon về trang chủ thì gọi onExit đúng một lần', async () => {
    const onExit = vi.fn()
    render(<SnapshotBanner title="Lẩu" onExit={onExit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Về trang chủ ứng dụng của tôi' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('không có ô nhập liệu nào trong chế độ xem', () => {
    render(<SnapshotBanner title="Lẩu" onExit={() => {}} />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('spinbutton')).toBeNull()
  })
})
