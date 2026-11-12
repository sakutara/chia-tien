import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentSlide } from '../../domain/paymentSlides'
import type { SettlementTransfer } from '../../types'
import TransferInstructionList from './TransferInstructionList'

afterEach(cleanup)

const transfer = (over: Partial<SettlementTransfer> = {}): SettlementTransfer => ({
  fromEntityId: 'binh',
  fromEntityName: 'Bình',
  toEntityId: 'an',
  toEntityName: 'An',
  amount: 45_000,
  key: 'binh->an',
  isPaid: false,
  ...over,
})

const slide: PaymentSlide = {
  key: 'binh->an',
  fromEntityId: 'binh',
  fromName: 'Bình',
  toEntityId: 'an',
  toName: 'An',
  amount: 45_000,
  content: 'Binh chuyen An',
  bank: { bankBin: '970422', bankName: 'MB Bank', accountName: 'AN', accountNumber: '0123456789' } as PaymentSlide['bank'],
  involvedIds: ['binh', 'an'],
}

describe('TransferInstructionList (BR-6.4, BR-6.5)', () => {
  it('không có chi phí thì không hiện gì', () => {
    render(<TransferInstructionList transfers={[transfer()]} hasCost={false} />)
    expect(screen.queryByLabelText('Hướng dẫn chuyển tiền')).toBeNull()
  })

  it('không có khoản chuyển nào thì báo không cần chuyển tiền', () => {
    render(<TransferInstructionList transfers={[]} hasCost />)
    expect(screen.getByText('Không cần chuyển tiền.')).toBeTruthy()
  })

  it('mỗi khoản ghi rõ ai chuyển cho ai, số tiền, và trạng thái đã chuyển qua nút tick', () => {
    render(
      <TransferInstructionList
        transfers={[transfer(), transfer({ fromEntityId: 'cuong', fromEntityName: 'Cường', key: 'cuong->an', isPaid: true })]}
        hasCost
      />,
    )
    const unpaid = screen.getByRole('button', { name: 'Đã chuyển: Bình cho An' })
    const paid = screen.getByRole('button', { name: 'Đã chuyển: Cường cho An' })
    expect(unpaid.getAttribute('aria-pressed')).toBe('false')
    expect(paid.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getAllByText('45.000 ₫')).toHaveLength(2)
  })

  it('bấm tick gọi onToggle với đúng khoản chuyển', async () => {
    const onToggle = vi.fn()
    const tr = transfer()
    render(<TransferInstructionList transfers={[tr]} hasCost onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: 'Đã chuyển: Bình cho An' }))
    expect(onToggle).toHaveBeenCalledWith(tr)
  })

  it('chế độ chỉ đọc khoá nút tick và không cho đánh dấu tất cả', () => {
    const onToggle = vi.fn()
    const onMarkAll = vi.fn()
    render(<TransferInstructionList transfers={[transfer()]} hasCost readOnly onToggle={onToggle} onMarkAll={onMarkAll} />)
    expect((screen.getByRole('button', { name: 'Đã chuyển: Bình cho An' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Đánh dấu tất cả đã chuyển' })).toBeNull()
  })

  it('nút đánh dấu tất cả chỉ hiện khi còn khoản chưa chuyển', async () => {
    const onMarkAll = vi.fn()
    const { rerender } = render(<TransferInstructionList transfers={[transfer()]} hasCost onMarkAll={onMarkAll} />)
    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã chuyển' }))
    expect(onMarkAll).toHaveBeenCalledTimes(1)

    rerender(<TransferInstructionList transfers={[transfer({ isPaid: true })]} hasCost onMarkAll={onMarkAll} />)
    expect(screen.queryByRole('button', { name: 'Đánh dấu tất cả đã chuyển' })).toBeNull()
  })

  it('khoản chưa chuyển có QR mở được hộp thoại chuyển tiền; khoản đã chuyển thì không', async () => {
    const { rerender } = render(<TransferInstructionList transfers={[transfer()]} hasCost slides={[slide]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Mở QR: Bình cho An' }))
    const dialog = await screen.findByRole('dialog', { name: 'QR chuyển tiền' })
    expect(within(dialog).getByRole('button', { name: /Thanh toán bằng ngân hàng|Pay with bank app/ })).toBeTruthy()

    rerender(<TransferInstructionList transfers={[transfer({ isPaid: true })]} hasCost slides={[slide]} />)
    expect(screen.queryByRole('button', { name: 'Mở QR: Bình cho An' })).toBeNull()
  })

  it('hiện đúng phần tiến độ và hành động được truyền vào', () => {
    render(
      <TransferInstructionList
        transfers={[transfer()]}
        hasCost
        progress={<span role="status">Đã thanh toán 0/1</span>}
        actions={<button type="button">Lưu trữ bữa</button>}
      />,
    )
    expect(screen.getByRole('status').textContent).toBe('Đã thanh toán 0/1')
    expect(screen.getByRole('button', { name: 'Lưu trữ bữa' })).toBeTruthy()
  })
})
