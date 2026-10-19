import { useEffect, useState } from 'react'
import { archiveMeal, getArchivePreview, type ArchivePreview } from '../../services/archiveService'
import { formatBytes } from '../../lib/bytes'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props {
  mealId: string
  mealTitle: string
  onClose: () => void
  onArchived: () => void
}

/** Xác nhận Lưu trữ bữa: nêu rõ những gì bị xoá vĩnh viễn và những gì được giữ lại (BR-7.2). Huỷ là mặc định. */
export default function ArchiveMealDialog({ mealId, mealTitle, onClose, onArchived }: Props) {
  const [preview, setPreview] = useState<ArchivePreview | null>(null)

  useEffect(() => {
    let alive = true
    void getArchivePreview(mealId).then((p) => {
      if (alive) setPreview(p)
    })
    return () => {
      alive = false
    }
  }, [mealId])

  return (
    <ConfirmDialog
      open
      title="Lưu trữ bữa?"
      tone="danger"
      confirmLabel="Lưu trữ bữa"
      message={
        <>
          Lưu trữ <strong>{mealTitle}</strong> sẽ khoá chỉnh sửa vĩnh viễn và xoá{' '}
          {preview ? (
            <strong>
              {preview.invoiceCount} hoá đơn, {preview.itemCount} chi tiết món cùng {preview.fileCount} file ảnh (
              {formatBytes(preview.totalFileBytes)})
            </strong>
          ) : (
            'hoá đơn, món và ảnh'
          )}{' '}
          để giải phóng bộ nhớ. Chỉ giữ lại chi phí từng kèo và lịch sử quyết toán. Không hoàn tác được.
        </>
      }
      onConfirm={async () => {
        await archiveMeal(mealId)
        onArchived()
      }}
      onCancel={onClose}
    />
  )
}
