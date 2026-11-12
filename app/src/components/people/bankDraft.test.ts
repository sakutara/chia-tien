import { describe, expect, it } from 'vitest'
import { emptyBankDraft, isBankDraftEmpty, type BankDraft } from './bankDraft'
import type { BankAccount } from '../../types'

const account: BankAccount = {
  bankBin: '970436',
  bankName: 'Vietcombank',
  accountName: 'NGUYEN VAN AN',
  accountNumber: '0123456789',
}

describe('bankDraft', () => {
  it('starts blank when the member has no bank account', () => {
    expect(emptyBankDraft()).toEqual({ bankBin: '', bankName: '', accountName: '', accountNumber: '' })
  })

  it('copies an existing bank account into the draft', () => {
    expect(emptyBankDraft(account)).toEqual({
      bankBin: '970436',
      bankName: 'Vietcombank',
      accountName: 'NGUYEN VAN AN',
      accountNumber: '0123456789',
    })
  })

  it('counts a draft as empty only when no bank, holder or number is filled in', () => {
    const blank: BankDraft = emptyBankDraft()
    expect(isBankDraftEmpty(blank)).toBe(true)
    expect(isBankDraftEmpty({ ...blank, accountName: '   ', accountNumber: ' ' })).toBe(true)
    expect(isBankDraftEmpty({ ...blank, bankBin: '970436' })).toBe(false)
    expect(isBankDraftEmpty({ ...blank, accountName: 'AN' })).toBe(false)
    expect(isBankDraftEmpty({ ...blank, accountNumber: '123' })).toBe(false)
  })
})
