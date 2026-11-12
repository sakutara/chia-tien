import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MemberBreakdown } from '../../types'
import MemberBreakdownList from './MemberBreakdownList'

afterEach(cleanup)

/** An ứng lẩu 90 000 chia đều cho 2 người; Bình không ứng và không tiêu gì. */
const an: MemberBreakdown = {
  memberId: 'an',
  memberName: 'An',
  paidInvoices: [{ invoiceId: 'i1', sessionId: 's1', sessionName: 'Kèo 1', vendorName: 'Lẩu Thái', amount: 90_000 }],
  chargeLines: [
    {
      sessionId: 's1',
      sessionName: 'Kèo 1',
      invoiceId: 'i1',
      vendorName: 'Lẩu Thái',
      kind: 'EQUAL_TOTAL',
      sourceAmount: 90_000,
      totalShares: 2,
      rawCost: 45_000,
    },
  ],
  totalPaid: 90_000,
  rawOwed: 45_000,
  totalOwed: 45_000,
  netBalance: 45_000,
}

const binh: MemberBreakdown = {
  memberId: 'binh',
  memberName: 'Bình',
  paidInvoices: [],
  chargeLines: [],
  totalPaid: 0,
  rawOwed: 0,
  totalOwed: 0,
  netBalance: 0,
}

describe('MemberBreakdownList (BR-6.2, AC-6)', () => {
  it('chưa có dữ liệu thì báo rõ, không hiện khối giải trình nào', () => {
    render(<MemberBreakdownList breakdowns={[]} />)
    expect(screen.getByText('Chưa có dữ liệu giải trình.')).toBeTruthy()
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('mỗi thành viên có khối giải trình riêng, ghi rõ số tiền đã ứng và đã tiêu', () => {
    render(<MemberBreakdownList breakdowns={[an, binh]} />)
    const anSection = screen.getByRole('region', { name: 'Giải trình của An' })
    expect(within(anSection).getByText('Đã ứng trước (90.000 ₫)')).toBeTruthy()
    expect(within(anSection).getByText('Tiêu dùng (45.000 ₫)')).toBeTruthy()
    expect(within(anSection).getByText('Lẩu Thái · Kèo 1')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Giải trình của Bình' })).toBeTruthy()
  })

  it('hoá đơn chia đều hiện số người chia và số tiền gốc', () => {
    render(<MemberBreakdownList breakdowns={[an]} />)
    expect(screen.getByText('Chia đều 90.000 ₫ cho 2 người')).toBeTruthy()
  })

  it('món chia theo phần hiện số phần và tiền của người đó', () => {
    const byItem: MemberBreakdown = {
      ...an,
      chargeLines: [
        {
          sessionId: 's1',
          sessionName: 'Kèo 1',
          invoiceId: 'i2',
          kind: 'BY_ITEM',
          itemName: 'Nồi lẩu',
          sourceAmount: 120_000,
          shares: 1,
          totalShares: 2,
          rawCost: 60_000,
        },
      ],
      totalOwed: 60_000,
    }
    render(<MemberBreakdownList breakdowns={[byItem]} />)
    expect(screen.getByText('Nồi lẩu · 120.000 ₫ × 1/2 phần')).toBeTruthy()
    expect(screen.getByText('Kèo 1 · Không rõ tên quán')).toBeTruthy()
  })

  it('thành viên không ứng và không tiêu được ghi là như vậy', () => {
    render(<MemberBreakdownList breakdowns={[binh]} />)
    expect(screen.getByText('Chưa ứng trước hoá đơn nào.')).toBeTruthy()
    expect(screen.getByText('Không tham gia món hay hoá đơn nào.')).toBeTruthy()
  })
})
