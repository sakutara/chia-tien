import { Crown, Landmark, Pencil, Unlink, Users, X } from 'lucide-react'
import { useState } from 'react'
import type { GroupView } from '../../hooks/useMealPeople'
import { dissolveGroup, hasPaidStatusAffected, removeParticipant } from '../../services/mealPeopleService'
import { PeopleError } from '../../services/peopleErrors'
import type { Meal, Member } from '../../types'
import ConfirmDialog from '../ui/ConfirmDialog'
import IconButton from '../ui/IconButton'
import MemberBankDialog from './MemberBankDialog'
import PaymentGroupDialog from './PaymentGroupDialog'
import { T, t } from '../../i18n'

interface Props {
  meal: Meal
  participants: Member[]
  groups: GroupView[]
  readOnly?: boolean
  /** Mở hộp tạo nhóm; do trang cha điều khiển để nút tạo nằm cạnh ô thêm người. */
  creatingGroup: boolean
  onCloseCreate: () => void
}

const REASON_TEXT: Record<string, string> = {
  payer: T('đang ứng tiền cho hoá đơn'),
  consumer: T('đang có trong danh sách ăn của món'),
  equalSplit: T('đang nằm trong danh sách chia đều của hoá đơn'),
}

const CHIP = 'flex min-h-9 min-w-0 items-center gap-1 rounded-full border border-usd-paper-200 bg-usd-paper-50 py-0.5 pl-2.5 pr-0.5 text-xs sm:pl-1 sm:text-sm'

/**
 * Thành viên của bữa (BR-2.10). Nhóm thanh toán gộp vào đây: nhóm thay thế các thành viên của nó
 * bằng một chip duy nhất, chỉ mở ra (xem thành viên, sửa, giải tán) khi được chọn.
 */
export default function MemberList({ meal, participants, groups, readOnly, creatingGroup, onCloseCreate }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [bankFor, setBankFor] = useState<Member | null>(null)
  const [confirming, setConfirming] = useState<Member | null>(null)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [editing, setEditing] = useState<GroupView | null>(null)
  const [dissolving, setDissolving] = useState<GroupView | null>(null)

  const grouped = new Set(groups.flatMap((g) => g.memberIds))
  const singles = participants.filter((m) => !grouped.has(m.id))
  const openGroup = groups.find((g) => g.id === openGroupId)

  function requestRemove(member: Member) {
    if (hasPaidStatusAffected(meal, [member.id])) setConfirming(member)
    else void handleRemove(member)
  }

  async function handleRemove(member: Member) {
    setError(null)
    try {
      await removeParticipant(meal.id, member.id)
    } catch (e) {
      if (e instanceof PeopleError && e.code === 'MEMBER_IN_USE') {
        const reasons = ((e.detail?.reasons as string[] | undefined) ?? []).map((r) => (REASON_TEXT[r] ? t(REASON_TEXT[r]) : r))
        setError(t('Không thể bỏ {name}: {reasons}.', { name: member.name, reasons: reasons.join(', ') }))
      } else if (e instanceof PeopleError && e.code === 'HOST_REQUIRED') {
        setError(t('Không thể bỏ {name} vì đang là người chủ trì. Hãy đổi chủ trì trước.', { name: member.name }))
      } else {
        setError(e instanceof Error ? e.message : t('Có lỗi không xác định.'))
      }
    }
  }

  async function dissolve(g: GroupView) {
    if (hasPaidStatusAffected(meal, g.memberIds, g.id)) {
      setDissolving(g)
      return
    }
    await dissolveGroup(meal.id, g.id)
    setOpenGroupId(null)
  }

  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap" aria-label={t('Người tham gia')}>
        {groups.map((g) => {
          const open = g.id === openGroupId
          return (
            <li key={g.id} className="min-w-0">
              <button
                type="button"
                aria-expanded={open}
                aria-label={t('Nhóm {name}', { name: g.name })}
                title={g.members.map((m) => m.name).join(', ')}
                onClick={() => setOpenGroupId(open ? null : g.id)}
                className={`${CHIP} w-full pr-2 font-semibold ${open ? 'border-usd-green-700 bg-usd-green-100' : ''}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-usd-green-700 text-usd-paper-50" aria-hidden="true">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 truncate">{g.name}</span>
                <span className="text-[10px] font-normal text-usd-green-700">{g.members.length}</span>
              </button>
            </li>
          )
        })}
        {singles.map((m) => (
          <li key={m.id} className={CHIP}>
            <span
              className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-usd-paper-50 sm:flex"
              style={{ backgroundColor: m.avatarColor }}
              aria-hidden="true"
            >
              {m.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1 truncate" title={m.name}>{m.name}</span>
            {m.id === meal.hostMemberId && <Crown className="h-3.5 w-3.5 shrink-0 text-usd-gold-600" aria-label={t('Chủ trì')} />}
            {!readOnly && (
              <IconButton
    icon={Landmark}
    label={t('Tài khoản ngân hàng của {name}', { name: m.name })}
    tone={m.bank ? 'primary' : 'default'}
    className="!h-7 !w-7 shrink-0 rounded-full"
    onClick={() => setBankFor(m)}
  />
            )}
            {readOnly || m.id === meal.hostMemberId ? (
              <span className="w-1" />
            ) : (
              <IconButton icon={X} label={t('Bỏ {name} khỏi bữa', { name: m.name })} className="!h-7 !w-7 shrink-0 rounded-full" onClick={() => requestRemove(m)} />
            )}
          </li>
        ))}
      </ul>

      {openGroup && (
        <div className="space-y-2 rounded-lg border border-usd-green-600/40 bg-usd-green-100/40 p-2 text-sm" role="group" aria-label={t('Chi tiết nhóm {name}', { name: openGroup.name })}>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 break-words">
              <strong>{openGroup.name}</strong>: {openGroup.members.map((m) => m.name).join(', ')}
            </span>
            {!readOnly && (
              <span className="flex shrink-0">
                <IconButton icon={Pencil} label={t('Sửa nhóm {name}', { name: openGroup.name })} onClick={() => setEditing(openGroup)} />
                <IconButton icon={Unlink} label={t('Giải tán nhóm {name}', { name: openGroup.name })} tone="danger" onClick={() => void dissolve(openGroup)} />
              </span>
            )}
          </div>
          {!readOnly && (
            <ul className="flex flex-wrap gap-1.5" aria-label={t('Thành viên nhóm {name}', { name: openGroup.name })}>
              {openGroup.members.map((m) => (
                <li key={m.id} className={`${CHIP} pl-3`}>
                  <span>{m.name}</span>
                  <IconButton
    icon={Landmark}
    label={t('Tài khoản ngân hàng của {name}', { name: m.name })}
    tone={m.bank ? 'primary' : 'default'}
    className="!h-7 !w-7 shrink-0 rounded-full"
    onClick={() => setBankFor(m)}
  />
                  {m.id === meal.hostMemberId ? (
                    <Crown className="h-3.5 w-3.5 text-usd-gold-600" aria-label={t('Chủ trì')} />
                  ) : (
                    <IconButton icon={X} label={t('Bỏ {name} khỏi bữa', { name: m.name })} className="!h-7 !w-7 shrink-0 rounded-full" onClick={() => requestRemove(m)} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-usd-red-600">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title={t('Bỏ người đã tick thanh toán?')}
        message={t('{name} đã được tick "Đã thanh toán". Bỏ người này sẽ xoá trạng thái đó.', { name: confirming?.name ?? '' })}
        confirmLabel={t('Bỏ khỏi bữa')}
        tone="danger"
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          const member = confirming
          setConfirming(null)
          if (member) await handleRemove(member)
        }}
      />
      <ConfirmDialog
        open={dissolving !== null}
        title={t('Giải tán nhóm đã tick thanh toán?')}
        message={t('Nhóm "{name}" có trạng thái "Đã thanh toán". Giải tán sẽ xoá trạng thái đó.', { name: dissolving?.name ?? '' })}
        confirmLabel={t('Giải tán nhóm')}
        tone="danger"
        onCancel={() => setDissolving(null)}
        onConfirm={async () => {
          const group = dissolving
          if (!group) return
          await dissolveGroup(meal.id, group.id)
          setDissolving(null)
          setOpenGroupId(null)
        }}
      />

      {bankFor && <MemberBankDialog member={bankFor} onClose={() => setBankFor(null)} />}

      {(creatingGroup || editing) && (
        <PaymentGroupDialog
          meal={meal}
          participants={participants}
          group={editing ?? undefined}
          onClose={() => {
            setEditing(null)
            onCloseCreate()
          }}
        />
      )}
    </div>
  )
}
