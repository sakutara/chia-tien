import { describe, expect, it } from 'vitest'
import { PeopleError } from '../../services/peopleErrors'
import { newItemRow, parseAdjustment, parseItemRows, suggestAmount } from './formState'

describe('parseItemRows', () => {
  it('bỏ qua dòng trống hoàn toàn, giữ dòng có dữ liệu', () => {
    const items = parseItemRows([
      newItemRow({ name: 'Lẩu', quantity: '2', unitPrice: '150k' }),
      newItemRow(), // dòng thêm vào rồi bỏ đó
    ])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ name: 'Lẩu', quantity: 2, unitPrice: 150_000, rawAmount: undefined })
  })

  it('đọc thành tiền nhập tay khi có', () => {
    const [item] = parseItemRows([newItemRow({ name: 'Bia', quantity: '10', unitPrice: '25000', amount: '200.000' })])
    expect(item.rawAmount).toBe(200_000)
  })

  it('báo lỗi có tên món khi đơn giá không đọc được', () => {
    expect(() => parseItemRows([newItemRow({ name: 'Bia', quantity: '1', unitPrice: 'abc' })])).toThrow(PeopleError)
  })
})

describe('parseAdjustment', () => {
  it('phần trăm phải là số nguyên, số tiền đọc như tiền VNĐ', () => {
    expect(parseAdjustment({ mode: 'PERCENTAGE', value: '8' }, 'VAT')).toEqual({ mode: 'PERCENTAGE', value: 8 })
    expect(parseAdjustment({ mode: 'FIXED_AMOUNT', value: '45k' }, 'VAT')).toEqual({ mode: 'FIXED_AMOUNT', value: 45_000 })
    expect(parseAdjustment({ mode: 'NONE', value: '' }, 'VAT')).toEqual({ mode: 'NONE', value: 0 })
  })

  it('từ chối phần trăm trống hoặc thập phân', () => {
    expect(() => parseAdjustment({ mode: 'PERCENTAGE', value: '' }, 'VAT')).toThrow(PeopleError)
    expect(() => parseAdjustment({ mode: 'PERCENTAGE', value: '8.5' }, 'VAT')).toThrow(PeopleError)
  })
})

describe('suggestAmount', () => {
  it('thành tiền gợi ý = số lượng × đơn giá, trống khi thiếu dữ liệu', () => {
    expect(suggestAmount('3', '150000')).toBe('450000')
    expect(suggestAmount('0', '150000')).toBe('')
    expect(suggestAmount('2', '')).toBe('')
  })
})
