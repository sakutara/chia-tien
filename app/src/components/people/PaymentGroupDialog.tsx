import { useState } from 'react'
import { createGroup, hasPaidStatusAffected, updateGroup } from '../../services/mealPeopleService'
import { PeopleError } from '../../services/peopleErrors'
import type { Meal, Member, PaymentGroup } from '../../types'
import ConfirmDialog from '../ui/ConfirmDialog'
import DialogActions from '../ui/DialogActions'

interface Props {
  meal: Meal
  participants: Member[]
  /** Nhóm đang sửa; không truyền thì là tạo mới. */
  group?: PaymentGroup
  onClose: () => void
}

const GROUP_NAME_MAX = 80

/**
 * Tạo / sửa nhóm thanh toán (BR-2.8, BR-2.9).
 * Người đã ở nhóm khác bị vô hiệu hoá và hiện tên nhóm đó.
 */
export default function PaymentGroupDialog({ meal, participants, group, onClose }: Props) {
  const [name, setName] = useState(group?.name ?? '')
  const [selected, setSelected] = useState<string[]>(group?.memberIds ?? [])
  const [representativeId] = useState<string | undefined>(group?.representativeId)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmingSave, setConfirmingSave] = useState(false)

  const groupOf = (memberId: string) =>
    meal.paymentGroups.find((g) => g.id !== group?.id && g.memberIds.includes(memberId))

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function requestSave() {
    setError(null)
    if (group) {
      const compositionChanged =
        group.memberIds.length !== selected.length || group.memberIds.some((id) => !selected.includes(id))
      if (compositionChanged && hasPaidStatusAffected(meal, [...group.memberIds, ...selected], group.id)) {
        setConfirmingSave(true)
        return
      }
    }
    void save()
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      if (group) {
        await updateGroup(meal.id, group.id, { name, memberIds: selected, representativeId })
      } else {
        await createGroup(meal.id, { name, memberIds: selected, representativeId })
      }
      onClose()
    } catch (e) {
      setError(e instanceof PeopleError ? e.message : 'Có lỗi không xác định.')
    } finally {
      setSaving(false)
    }
  }

  const chosen = participants.filter((p) => selected.includes(p.id))
  // Người đã ở nhóm khác không hiện nữa (giữ lại các thành viên của chính nhóm đang sửa).
  const available = participants.filter((p) => !groupOf(p.id))

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="group-dialog-title" className="card space-y-3">
      <h3 id="group-dialog-title" className="text-base font-semibold">
        {group ? 'Sửa nhóm' : 'Tạo nhóm'}
      </h3>

      <input
        id="group-name"
        aria-label="Tên nhóm"
        value={name}
        maxLength={GROUP_NAME_MAX}
        onChange={(e) => setName(e.target.value)}
        placeholder={chosen.map((c) => c.name).join(' + ') || 'Tên nhóm (tuỳ chọn)'}
        className="field min-h-10"
      />

      <fieldset>
        <legend className="mb-1 text-xs text-usd-green-700">Chọn ít nhất 2 người</legend>
        {available.length === 0 ? (
          <p className="text-sm text-usd-green-700">Không còn ai để thêm vào nhóm.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {available.map((p) => (
              <li key={p.id}>
                <label className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${selected.includes(p.id) ? 'border-usd-green-700 bg-usd-green-100' : 'border-usd-paper-200 hover:bg-usd-paper-200'}`}>
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-usd-green-800" />
                  <span>{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-usd-red-600">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmingSave}
        title="Đổi thành phần nhóm?"
        message={'Có người trong nhóm đã được tick "Đã thanh toán". Đổi thành phần sẽ xoá các trạng thái đó.'}
        confirmLabel="Vẫn đổi"
        tone="danger"
        onCancel={() => setConfirmingSave(false)}
        onConfirm={async () => {
          setConfirmingSave(false)
          await save()
        }}
      />

      <DialogActions onCancel={onClose} saveLabel={group ? 'Lưu thay đổi' : 'Tạo nhóm'} onSave={requestSave} saving={saving} saveDisabled={selected.length < 2} />
    </div>
  )
}
