import { useEffect, useState } from 'react'
import { formatDateVi } from '../../lib/dates'
import { deleteMeal, getDeletePreview, type DeletePreview } from '../../services/mealService'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props {
  mealId: string
  title: string
  date: string
  onClose: () => void
  onDeleted: () => void
}

/** Xác nhận xoá bữa kèm số lượng sẽ mất (BR-3.3, R-7). */
export default function DeleteMealDialog({ mealId, title, date, onClose, onDeleted }: Props) {
  const [preview, setPreview] = useState<DeletePreview | null>(null)

  useEffect(() => {
    let cancelled = false
    getDeletePreview(mealId)
      .then((p) => !cancelled && setPreview(p))
      .catch(() => !cancelled && setPreview(null))
    return () => {
      cancelled = true
    }
  }, [mealId])

  const parts = preview
    ? ([
        [preview.sessions, 'kèo'],
        [preview.invoices, 'hoá đơn'],
        [preview.items, 'món'],
        [preview.files, 'file ảnh'],
      ] as const)
        .filter(([n]) => n > 0)
        .map(([n, label]) => `${n} ${label}`)
    : []

  return (
    <ConfirmDialog
      open
      title="Xoá bữa này?"
      tone="danger"
      confirmLabel="Xoá bữa"
      message={
        <div className="space-y-2">
          <p>
            Bữa <strong>{title}</strong> ({formatDateVi(date)}) sẽ bị xoá vĩnh viễn.
          </p>
          {parts.length > 0 && <p>Sẽ mất kèm theo: {parts.join(', ')}.</p>}
          <p>Không thể hoàn tác. Danh bạ thành viên vẫn được giữ.</p>
        </div>
      }
      onCancel={onClose}
      onConfirm={async () => {
        await deleteMeal(mealId)
        onDeleted()
      }}
    />
  )
}
