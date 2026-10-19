import { formatMoney } from '../../lib/money'
import { setEqualSplitParticipants } from '../../services/invoiceService'
import { PeopleError } from '../../services/peopleErrors'
import type { Invoice, Member } from '../../types'
import PeoplePicker from '../ui/PeoplePicker'

interface Props {
  invoice: Invoice
  /** Người đang tham gia kèo: chỉ họ được chọn chia đều (BR-5.5, R-1). */
  sessionMembers: Member[]
  readOnly: boolean
  onError: (message: string) => void
}

const errorText = (err: unknown) => (err instanceof PeopleError ? err.message : 'Có lỗi không xác định.')

/** Những người cùng chia đều hoá đơn (BR-5.5, R-4): chuỗi tên bấm để thêm bớt, tối thiểu một người. */
export default function EqualSplitPicker({ invoice, sessionMembers, readOnly, onError }: Props) {
  const selected = invoice.equalSplitParticipantIds
  const perPerson = selected.length > 0 ? Math.round(invoice.totalAmount / selected.length) : 0

  return (
    <div className="text-sm" aria-label="Người chia đều">
      <span className="text-usd-green-700">Chia đều: </span>
      <PeoplePicker
        mode="multi"
        label="Người chia đều"
        options={sessionMembers}
        value={selected}
        min={1}
        readOnly={readOnly}
        onChange={(ids) => void setEqualSplitParticipants(invoice.id, ids).catch((err) => onError(errorText(err)))}
      />
      <span className="money ml-1 text-xs text-usd-green-700">
        · {formatMoney(perPerson)}/người
      </span>
    </div>
  )
}
