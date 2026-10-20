import { Check, X } from 'lucide-react'
import IconButton from './IconButton'
import { t } from '../../i18n'

interface Props {
  onCancel: () => void
  /** Tên truy cập của nút lưu, ví dụ "Lưu hoá đơn". */
  saveLabel: string
  cancelLabel?: string
  saving?: boolean
  /** Nút lưu là `submit` của form chứa nó; đặt `onSave` khi không nằm trong form. */
  onSave?: () => void
  saveDisabled?: boolean
}

/** Chân hộp thoại gồm hai nút icon: Huỷ (X) và Lưu (dấu tick). */
export default function DialogActions({ onCancel, saveLabel, cancelLabel = t('Huỷ'), saving, onSave, saveDisabled }: Props) {
  return (
    <div className="flex justify-end gap-2">
      <IconButton icon={X} label={cancelLabel} tone="outline" onClick={onCancel} />
      <IconButton
        icon={Check}
        label={saveLabel}
        tone="primary"
        type={onSave ? 'button' : 'submit'}
        onClick={onSave}
        disabled={saving || saveDisabled}
      />
    </div>
  )
}
