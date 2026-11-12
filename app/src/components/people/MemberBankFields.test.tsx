import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemberBankFields from './MemberBankFields'
import { emptyBankDraft, type BankDraft } from './bankDraft'
import { findBankByBin } from '../../domain/banks'

afterEach(cleanup)

const draft: BankDraft = { bankBin: '', bankName: '', accountName: '', accountNumber: '' }

describe('MemberBankFields', () => {
  it('labels its three inputs so each can be reached by name', () => {
    render(<MemberBankFields idBase="x" value={draft} onChange={() => {}} />)
    expect(screen.getByLabelText('Ngân hàng')).toBeTruthy()
    expect(screen.getByLabelText('Tên chủ tài khoản')).toBeTruthy()
    expect(screen.getByLabelText('Số tài khoản')).toBeTruthy()
  })

  it('reports the bank name and BIN together when a bank is picked', async () => {
    const onChange = vi.fn()
    render(<MemberBankFields idBase="x" value={draft} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Ngân hàng'), 'techcom')
    await userEvent.click(screen.getByRole('option', { name: /Techcombank/ }))

    const bin = findBankByBin('970407')!.bin
    expect(onChange).toHaveBeenLastCalledWith({ ...draft, bankBin: bin, bankName: 'Techcombank' })
  })

  it('reports each typed holder name and account number with the rest of the draft unchanged', async () => {
    const onChange = vi.fn()
    const value = emptyBankDraft({ bankBin: '970436', bankName: 'Vietcombank', accountName: '', accountNumber: '' })
    render(<MemberBankFields idBase="x" value={value} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Tên chủ tài khoản'), 'A')
    expect(onChange).toHaveBeenLastCalledWith({ ...value, accountName: 'A' })

    await userEvent.type(screen.getByLabelText('Số tài khoản'), '7')
    expect(onChange).toHaveBeenLastCalledWith({ ...value, accountNumber: '7' })
  })

  it('shows the values of the draft in the inputs', () => {
    render(
      <MemberBankFields
        idBase="x"
        value={{ bankBin: '970436', bankName: 'Vietcombank', accountName: 'NGUYEN VAN AN', accountNumber: '0123456789' }}
        onChange={() => {}}
      />,
    )
    expect((screen.getByLabelText('Tên chủ tài khoản') as HTMLInputElement).value).toBe('NGUYEN VAN AN')
    expect((screen.getByLabelText('Số tài khoản') as HTMLInputElement).value).toBe('0123456789')
    expect((screen.getByLabelText('Số tài khoản') as HTMLInputElement).getAttribute('inputmode')).toBe('numeric')
  })
})
