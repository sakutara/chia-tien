import { Crown } from 'lucide-react'
import { setHost } from '../../services/mealPeopleService'
import type { Member } from '../../types'
import { t } from '../../i18n'

interface Props {
  mealId: string
  participants: Member[]
  hostMemberId: string
  readOnly?: boolean
}

/** Chủ trì của bữa: chọn ngay trên thông tin bữa, chỉ liệt kê người đã tham gia (R-8, BR-2.6). */
export default function HostSelector({ mealId, participants, hostMemberId, readOnly }: Props) {
  const host = participants.find((m) => m.id === hostMemberId)
  if (readOnly) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold">
        <Crown className="h-4 w-4 text-usd-gold-600" aria-hidden="true" />
        {host?.name ?? '—'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Crown className="h-4 w-4 shrink-0 text-usd-gold-600" aria-hidden="true" />
      <select
        aria-label={t('Người chủ trì')}
        value={hostMemberId}
        onChange={(e) => void setHost(mealId, e.target.value)}
        className="field w-auto max-w-[12rem] font-semibold"
      >
        {participants.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </span>
  )
}
