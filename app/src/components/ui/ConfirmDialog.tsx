import { useState, type ReactNode } from 'react'
import Modal from './Modal'
import { t } from '../../i18n'

interface Props {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  tone?: 'danger'
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

/** Hộp xác nhận (BR-3.12). Nút Huỷ được focus mặc định (R-7); lỗi từ `onConfirm` hiện ngay trong hộp. */
export default function ConfirmDialog({ open, title, message, confirmLabel, tone, onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Có lỗi không xác định.'))
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    setError(null)
    onCancel()
  }

  return (
    <Modal open={open} title={title} onClose={cancel}>
      <div className="space-y-4">
        <div className="text-sm">{message}</div>
        {error && (
          <p role="alert" className="text-sm text-usd-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary min-h-11" data-autofocus onClick={cancel} disabled={busy}>
            {t('Huỷ')}
          </button>
          <button
            type="button"
            className={`${tone === 'danger' ? 'btn-danger' : 'btn-primary'} min-h-11`}
            onClick={confirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
