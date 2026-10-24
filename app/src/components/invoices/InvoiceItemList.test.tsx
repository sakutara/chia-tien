import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { InvoiceItem } from '../../types'
import InvoiceItemList from './InvoiceItemList'

afterEach(cleanup)

// jsdom chưa có PointerEvent nên clientY bị mất; dùng MouseEvent thay thế.
if (!('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
    }
  }
  Object.assign(window, { PointerEvent: PointerEventPolyfill })
}

const item = (id: string, name: string, orderIndex: number): InvoiceItem => ({
  id, mealId: 'm', sessionId: 's', invoiceId: 'i', name, quantity: 1, unitPrice: 1000, rawAmount: 1000,
  allocatedDiscountAmount: 0, allocatedServiceAmount: 0, allocatedVatAmount: 0, finalAmount: 1000, consumers: [], orderIndex,
})
const items = [item('a', 'Bia', 0), item('b', 'Gà', 1), item('c', 'Cơm', 2)]

function mount(readOnly = false) {
  const onReorder = vi.fn()
  render(
    <InvoiceItemList items={items} splitType="EQUAL_TOTAL" sessionMembers={[]} readOnly={readOnly} onDelete={() => {}} onReorder={onReorder} onError={() => {}} />,
  )
  // Mỗi hàng cao 100px, xếp liên tiếp từ y = 0.
  const rowEls = screen.getAllByRole('listitem').filter((el) => el.getAttribute('aria-label')?.startsWith('Món '))
  rowEls.forEach((el, i) => {
    el.getBoundingClientRect = () => ({ top: i * 100, height: 100, bottom: i * 100 + 100, left: 0, right: 300, width: 300, x: 0, y: i * 100, toJSON() {} })
  })
  return onReorder
}

describe('InvoiceItemList', () => {
  it('hiện số thứ tự không sửa được trước mỗi món', () => {
    mount()
    expect(screen.getByLabelText('Món số 1').textContent).toBe('1.')
    expect(screen.getByLabelText('Món số 3').textContent).toBe('3.')
  })

  it('kéo món đầu xuống cuối: hiện ô trống đúng chỗ, thả xong báo thứ tự mới', () => {
    const onReorder = mount()
    const handle = screen.getByLabelText('Kéo để đổi vị trí món Bia')
    handle.setPointerCapture = () => {}
    handle.hasPointerCapture = () => false
    fireEvent.pointerDown(handle, { clientY: 50, pointerId: 1, button: 0 })
    fireEvent.pointerMove(handle, { clientY: 280, pointerId: 1 })
    const list = screen.getAllByRole('list')[0]
    // Ô trống nằm sau món cuối, các món còn lại đánh số lại 1, 2.
    expect(list.lastElementChild?.getAttribute('data-testid')).toBe('drop-placeholder')
    fireEvent.pointerUp(handle, { clientY: 280, pointerId: 1 })
    expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a'])
    // Hiển thị ngay theo vị trí mới.
    const names = screen.getAllByLabelText(/^Món số/).map((el) => el.parentElement?.textContent)
    expect(names[2]).toContain('Bia')
  })

  it('thả về chỗ cũ thì không gọi onReorder; chỉ đọc thì không có tay nắm', () => {
    const onReorder = mount()
    const handle = screen.getByLabelText('Kéo để đổi vị trí món Gà')
    handle.setPointerCapture = () => {}
    handle.hasPointerCapture = () => false
    fireEvent.pointerDown(handle, { clientY: 150, pointerId: 1, button: 0 })
    fireEvent.pointerUp(handle, { clientY: 150, pointerId: 1 })
    expect(onReorder).not.toHaveBeenCalled()
    cleanup()
    mount(true)
    expect(screen.queryByLabelText(/Kéo để đổi vị trí/)).toBeNull()
  })
})
