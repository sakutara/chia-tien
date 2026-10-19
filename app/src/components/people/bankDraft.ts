import type { BankAccount } from '../../types'

export interface BankDraft {
  bankBin: string
  bankName: string
  accountName: string
  accountNumber: string
}

export const emptyBankDraft = (bank?: BankAccount): BankDraft => ({
  bankBin: bank?.bankBin ?? '',
  bankName: bank?.bankName ?? '',
  accountName: bank?.accountName ?? '',
  accountNumber: bank?.accountNumber ?? '',
})

export const isBankDraftEmpty = (d: BankDraft) => !d.bankBin && !d.accountName.trim() && !d.accountNumber.trim()
