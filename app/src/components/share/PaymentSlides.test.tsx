import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentSlide } from '../../domain/paymentSlides'
import PaymentSlides from './PaymentSlides'

const slide: PaymentSlide = {
  key: 'a',
  fromEntityId: 'm1',
  fromName: 'An',
  toEntityId: 'm2',
  toName: 'Bình',
  amount: 150000,
  content: 'An chuyen Binh',
  bank: { bankName: 'VCB', accountName: 'BINH', accountNumber: '0123456789' } as PaymentSlide['bank'],
  involvedIds: ['m1', 'm2'],
}

afterEach(() => Reflect.deleteProperty(navigator, 'share'))

describe('PaymentSlides - thanh toán bằng ngân hàng', () => {
  it('mở menu chia sẻ của thiết bị kèm thông tin chuyển khoản', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(<PaymentSlides slides={[slide]} />)
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán bằng ngân hàng|Pay with bank app/ }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(share.mock.calls[0][0].text).toContain('0123456789')
  })

  it('không hiện nút khi người nhận chưa có tài khoản', () => {
    render(<PaymentSlides slides={[{ ...slide, bank: undefined }]} />)
    expect(screen.queryByRole('button', { name: /Thanh toán bằng ngân hàng|Pay with bank app/ })).toBeNull()
  })
})
