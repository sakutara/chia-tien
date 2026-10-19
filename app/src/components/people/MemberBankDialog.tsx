import { useState, type FormEvent } from 'react'
import { updateMemberBank } from '../../services/memberService'
import { PeopleError } from '../../services/peopleErrors'
import type { Member } from '../../types'
import DialogActions from '../ui/DialogActions'
import IconButton from '../ui/IconButton'
import Modal from '../ui/Modal'
import { Trash2 } from 'lucide-react'
import { emptyBankDraft, isBankDraftEmpty } from './bankDraft'
import MemberBankFields from './MemberBankFields'

interface Props {
  member: Member
  onClose: () => void
}

/** Nhập/sửa/xoá tài khoản ngân hàng của một người (lưu vào danh bạ, dùng cho mọi bữa). */
export default function MemberBankDialog({ member, onClose }: Props) {
  const [draft, setDraft] = useState(() => emptyBankDraft(member.bank))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save(next: typeof draft | null) {
    setError(null)
    setSaving(true)
    try {
      await updateMemberBank(member.id, next)
      onClose()
    } catch (err) {
      setError(err instanceof PeopleError ? err.message : 'Có lỗi không xác định.')
    } finally {
      setSaving(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    void save(isBankDraftEmpty(draft) ? null : draft)
  }

  return (
    <Modal open title={`Tài khoản ngân hàng — ${member.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <MemberBankFields idBase={`bank-${member.id}`} value={draft} onChange={setDraft} />
        {error && (
          <p role="alert" className="text-sm text-usd-red-600">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          {member.bank ? <IconButton icon={Trash2} label="Xoá tài khoản ngân hàng" tone="danger" onClick={() => void save(null)} /> : <span />}
          <DialogActions onCancel={onClose} saveLabel="Lưu tài khoản" saving={saving} />
        </div>
      </form>
    </Modal>
  )
}
