import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { MemberBreakdown, PaymentEntitySettlement } from '../../types'
import EntityGroupList from './EntityGroupList'

afterEach(cleanup)

const individual: PaymentEntitySettlement = {
  entityId: 'an',
  entityName: 'An',
  isGroup: false,
  memberIds: ['an'],
  memberNames: ['An'],
  totalPaid: 90_000,
  totalOwed: 45_000,
  netBalance: 45_000,
  isPaid: false,
}

/** Nhóm Cường - Dung ứng 30 000 và tiêu 60 000: phải trả thêm 30 000. */
const group: PaymentEntitySettlement = {
  entityId: 'g1',
  entityName: 'Cường - Dung',
  isGroup: true,
  memberIds: ['cuong', 'dung'],
  memberNames: ['Cường', 'Dung'],
  totalPaid: 30_000,
  totalOwed: 60_000,
  netBalance: -30_000,
  isPaid: false,
}

const breakdowns: MemberBreakdown[] = ['cuong', 'dung'].map((id) => ({
  memberId: id,
  memberName: id === 'cuong' ? 'Cường' : 'Dung',
  paidInvoices: [],
  chargeLines: [],
  totalPaid: 0,
  rawOwed: 30_000,
  totalOwed: 30_000,
  netBalance: 0,
}))

describe('EntityGroupList (BR-6.6)', () => {
  it('mỗi thực thể một dòng kèm số dư: nhận lại, phải trả, hoặc cân bằng', () => {
    const balanced: PaymentEntitySettlement = { ...individual, entityId: 'bình', entityName: 'Bình', netBalance: 0 }
    render(<EntityGroupList entities={[individual, group, balanced]} breakdowns={breakdowns} />)
    const list = screen.getByRole('list', { name: 'Thực thể thanh toán' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(within(list).getByRole('listitem', { name: 'Thực thể An' }).textContent).toContain('Nhận lại +45.000 ₫')
    expect(within(list).getByRole('listitem', { name: 'Thực thể Cường - Dung' }).textContent).toContain('Phải trả −30.000 ₫')
    expect(within(list).getByRole('listitem', { name: 'Thực thể Bình' }).textContent).toContain('Cân bằng')
  })

  it('nhóm có biểu tượng nhóm, người lẻ thì không', () => {
    render(<EntityGroupList entities={[individual, group]} breakdowns={breakdowns} />)
    expect(screen.getAllByLabelText('Nhóm')).toHaveLength(1)
  })

  it('mặc định đóng; bấm mở thì thấy ứng trước, chi và giải trình của từng thành viên', async () => {
    render(<EntityGroupList entities={[group]} breakdowns={breakdowns} />)
    expect(screen.queryByText('Ứng trước')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Giải trình của Cường' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết Cường - Dung' }))
    expect(screen.getByText('Ứng trước')).toBeTruthy()
    expect(screen.getByText('60.000 ₫')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Giải trình của Cường' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Giải trình của Dung' })).toBeTruthy()
  })

  it('thực thể không có giải trình tương ứng thì không lỗi và không hiện khối trống', async () => {
    render(<EntityGroupList entities={[individual]} breakdowns={[]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết An' }))
    expect(screen.getByText('Chi')).toBeTruthy()
    expect(screen.queryByRole('region')).toBeNull()
  })
})
