import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  bank: { bankBin: '970422', bankName: 'MB Bank', accountName: 'BINH', accountNumber: '0123456789' } as PaymentSlide['bank'],
  involvedIds: ['m1', 'm2'],
}

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, 'share')
})

describe('PaymentSlides - thanh toán bằng ngân hàng', () => {
  it('mở menu chia sẻ của thiết bị kèm thông tin chuyển khoản', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(<PaymentSlides slides={[slide]} />)
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán bằng ngân hàng|Pay with bank app/ }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(share.mock.calls[0][0].text).toContain('0123456789')
  })

  it('ngân hàng được hỗ trợ có link mở thẳng app kèm số tiền và nội dung', () => {
    render(<PaymentSlides slides={[slide]} />)
    const href = screen.getByRole('link', { name: /Mở app MB Bank|Open MB Bank app/ }).getAttribute('href') ?? ''
    expect(href).toContain('dl.vietqr.io/pay?app=mb')
    expect(href).toContain('am=150000')
    expect(href).toContain('ba=0123456789@mb&')
    expect(href).toContain('tn=An%20chuyen%20Binh')
    expect(href).not.toContain('+')
  })

  it('không hiện nút khi người nhận chưa có tài khoản', () => {
    render(<PaymentSlides slides={[{ ...slide, bank: undefined }]} />)
    expect(screen.queryByRole('button', { name: /Thanh toán bằng ngân hàng|Pay with bank app/ })).toBeNull()
  })
})
