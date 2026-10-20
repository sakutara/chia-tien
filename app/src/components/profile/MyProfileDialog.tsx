import { useState, type FormEvent } from 'react'
import { renameMember, updateMemberBank } from '../../services/memberService'
import { emptyBankDraft, isBankDraftEmpty } from '../people/bankDraft'
import MemberBankFields from '../people/MemberBankFields'
import { PeopleError } from '../../services/peopleErrors'
import type { Member } from '../../types'
import DialogActions from '../ui/DialogActions'
import Modal from '../ui/Modal'
import { DEFAULT_HOST_NAME } from '../../db/localize'
import { t } from '../../i18n'

interface Props {
  profile: Member
  onClose: () => void
}

/** Đổi tên hồ sơ "Tôi" (BR-3.11). Không xoá được; tên theo quy tắc Epic 2 R-1, R-2. */
export default function MyProfileDialog({ profile, onClose }: Props) {
  const [name, setName] = useState(profile.name)
  const [bank, setBank] = useState(() => emptyBankDraft(profile.bank))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      // Giữ tên mặc định ở dạng gốc (tiếng Việt) để nó vẫn đổi theo ngôn ngữ (BR-9.9).
      await renameMember(profile.id, name.trim() === t(DEFAULT_HOST_NAME) ? DEFAULT_HOST_NAME : name)
      await updateMemberBank(profile.id, isBankDraftEmpty(bank) ? null : bank)
      onClose()
    } catch (err) {
      setError(err instanceof PeopleError ? err.message : t('Có lỗi không xác định.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={t('Hồ sơ của tôi')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
            {t('Tên của tôi')}
          </label>
          <input
            id="profile-name"
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field min-h-10"
          />
          <p className="mt-1 text-xs text-usd-green-700">{t('Hồ sơ này là người chủ trì mặc định của mọi bữa mới và không xoá được.')}</p>
        </div>
        <fieldset className="space-y-2 border-t border-usd-paper-200 pt-3">
          <legend className="text-sm font-semibold">{t('Tài khoản ngân hàng')}</legend>
          <p className="text-xs text-usd-green-700">{t('Dùng để tạo mã QR khi người khác cần chuyển tiền cho bạn. Để trống nếu không cần.')}</p>
          <MemberBankFields idBase="profile" value={bank} onChange={setBank} />
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-usd-red-600">
            {error}
          </p>
        )}
        <DialogActions onCancel={onClose} saveLabel={t('Lưu hồ sơ')} saving={saving} />
      </form>
    </Modal>
  )
}
