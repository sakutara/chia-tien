import { render, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ImageViewerDialog from './ImageViewerDialog'

vi.mock('../../services/fileStorageService', () => ({
  getFileBlob: vi.fn(async () => undefined),
  downloadFile: vi.fn(async () => true),
}))

describe('ImageViewerDialog', () => {
  it('Esc chỉ gọi onClose của trình xem và huỷ sự kiện mặc định (không đóng dialog cha)', () => {
    const onClose = vi.fn()
    const parentCancel = vi.fn()
    const parent = document.createElement('dialog')
    parent.addEventListener('cancel', parentCancel)
    document.body.appendChild(parent)

    render(<ImageViewerDialog fileId="f1" fileName="bill.jpg" onClose={onClose} />)
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    window.dispatchEvent(event)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    expect(parentCancel).not.toHaveBeenCalled()
    parent.remove()
  })

  it('phím khác Esc không đóng trình xem', () => {
    const onClose = vi.fn()
    render(<ImageViewerDialog fileId="f1" fileName="bill.jpg" onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
