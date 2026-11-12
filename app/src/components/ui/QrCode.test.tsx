import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import QrCode from './QrCode'

afterEach(cleanup)

describe('QrCode', () => {
  it('is an image named for screen readers', () => {
    render(<QrCode value="00020101021238" label="Mã QR chuyển khoản" />)
    expect(screen.getByRole('img', { name: 'Mã QR chuyển khoản' })).toBeTruthy()
  })

  it('draws a different code for a different value, and the same code for the same value', () => {
    const { container, rerender } = render(<QrCode value="ABC" label="qr" />)
    const drawn = (c: HTMLElement) => c.querySelector('path')?.getAttribute('d') ?? ''
    const first = drawn(container)
    expect(first.length).toBeGreaterThan(0)

    rerender(<QrCode value="XYZ-123" label="qr" />)
    const second = drawn(container)
    expect(second).not.toBe(first)

    rerender(<QrCode value="XYZ-123" label="qr" />)
    expect(drawn(container)).toBe(second)
  })
})
