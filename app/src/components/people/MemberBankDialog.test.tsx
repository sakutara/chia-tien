import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ensureDefaultData } from '../../db/seed'
import { getOrCreateMember } from '../../services/memberService'
import MemberBankDialog from './MemberBankDialog'

afterEach(cleanup)

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await ensureDefaultData()
})

describe('MemberBankDialog', () => {
  it('tìm nhanh ngân hàng không cần dấu, chọn rồi lưu tài khoản', async () => {
    const { member } = await getOrCreateMember('Bình', new Date().toISOString())
    const onClose = vi.fn()
    render(<MemberBankDialog member={member} onClose={onClose} />)

    await userEvent.type(screen.getByRole('combobox'), 'quan doi')
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    await userEvent.click(options[0])
    await userEvent.type(screen.getByLabelText('Tên chủ tài khoản'), 'TRAN VAN BINH')
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '0987 654 321')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect((await db.members.get(member.id))?.bank).toEqual({
      bankBin: '970422', bankName: 'MB Bank', accountName: 'TRAN VAN BINH', accountNumber: '0987654321',
    })
  })

  it('báo lỗi khi chưa chọn ngân hàng', async () => {
    const { member } = await getOrCreateMember('Bình', new Date().toISOString())
    render(<MemberBankDialog member={member} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Tên chủ tài khoản'), 'BINH')
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '123456789')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Hãy chọn ngân hàng.')
  })
})
