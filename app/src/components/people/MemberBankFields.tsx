import BankSelect from './BankSelect'

import type { BankDraft } from './bankDraft'

interface Props {
  idBase: string
  value: BankDraft
  onChange: (next: BankDraft) => void
}

/** Ba ô nhập tài khoản ngân hàng: ngân hàng (tìm nhanh), tên chủ tài khoản, số tài khoản. */
export default function MemberBankFields({ idBase, value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idBase}-bank`} className="mb-1 block text-sm font-medium">Ngân hàng</label>
        <BankSelect id={`${idBase}-bank`} value={value.bankBin} onChange={(b) => onChange({ ...value, bankBin: b.bin, bankName: b.name })} />
      </div>
      <div>
        <label htmlFor={`${idBase}-holder`} className="mb-1 block text-sm font-medium">Tên chủ tài khoản</label>
        <input
          id={`${idBase}-holder`}
          value={value.accountName}
          autoComplete="off"
          onChange={(e) => onChange({ ...value, accountName: e.target.value })}
          className="field min-h-10"
        />
      </div>
      <div>
        <label htmlFor={`${idBase}-number`} className="mb-1 block text-sm font-medium">Số tài khoản</label>
        <input
          id={`${idBase}-number`}
          inputMode="numeric"
          autoComplete="off"
          value={value.accountNumber}
          onChange={(e) => onChange({ ...value, accountNumber: e.target.value })}
          className="field money min-h-10 !text-left"
        />
      </div>
    </div>
  )
}
