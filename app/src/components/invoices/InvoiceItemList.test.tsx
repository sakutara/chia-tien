import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { InvoiceItem } from '../../types'
import InvoiceItemList from './InvoiceItemList'

afterEach(cleanup)

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
  return onReorder
}

const order = () => screen.getAllByRole('listitem').map((el) => el.getAttribute('aria-label'))
const numbers = () => [...document.querySelectorAll('[data-item-number]')].map((el) => el.textContent)

describe('InvoiceItemList', () => {
  it('hiện số thứ tự không sửa được trước mỗi món', () => {
    mount()
    expect(numbers()).toEqual(['1.', '2.', '3.'])
    expect(document.querySelectorAll('[data-item-number] input')).toHaveLength(0)
  })

  it('nút xuống đổi chỗ món với món liền sau, hiển thị ngay và báo thứ tự mới', () => {
    const onReorder = mount()
    fireEvent.click(screen.getByLabelText('Chuyển món Bia xuống'))
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
    expect(order()).toEqual(['Món Gà', 'Món Bia', 'Món Cơm'])
    expect(numbers()).toEqual(['1.', '2.', '3.'])
  })

  it('nút lên đổi chỗ với món liền trước', () => {
    const onReorder = mount()
    fireEvent.click(screen.getByLabelText('Chuyển món Cơm lên'))
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b'])
  })

  it('món đầu không chuyển lên được, món cuối không chuyển xuống được', () => {
    mount()
    expect((screen.getByLabelText('Chuyển món Bia lên') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Chuyển món Cơm xuống') as HTMLButtonElement).disabled).toBe(true)
  })

  it('chỉ đọc thì không có nút chuyển', () => {
    mount(true)
    expect(screen.queryByLabelText(/Chuyển món/)).toBeNull()
  })
})
