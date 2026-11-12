import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ShareMealAction from './ShareMealAction'

// Hộp thoại thật cần dữ liệu bữa và snapshot (đã có test riêng); ở đây chỉ kiểm tra nút mở/đóng và mealId truyền vào.
vi.mock('./ShareMealDialog', () => ({
  default: ({ mealId, onClose }: { mealId: string; onClose: () => void }) => (
    <div role="dialog" aria-label="Chia sẻ giả lập">
      <span>{mealId}</span>
      <button type="button" onClick={onClose}>
        Đóng giả lập
      </button>
    </div>
  ),
}))

afterEach(cleanup)

describe('ShareMealAction (BR-8.6)', () => {
  it('nút chia sẻ là icon có tên, ban đầu chưa mở hộp thoại', () => {
    render(<ShareMealAction mealId="meal-1" />)
    expect(screen.getByRole('button', { name: 'Chia sẻ thông báo thanh toán' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('bấm nút thì mở hộp thoại chia sẻ đúng bữa', async () => {
    render(<ShareMealAction mealId="meal-42" />)
    await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ thông báo thanh toán' }))
    const dialog = screen.getByRole('dialog', { name: 'Chia sẻ giả lập' })
    expect(dialog.textContent).toContain('meal-42')
  })

  it('đóng hộp thoại thì hộp biến mất', async () => {
    render(<ShareMealAction mealId="meal-1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Chia sẻ thông báo thanh toán' }))
    await userEvent.click(screen.getByRole('button', { name: 'Đóng giả lập' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
