import { useEffect, useState } from 'react'
import { archiveMeal, getArchivePreview, type ArchivePreview } from '../../services/archiveService'
import { formatBytes } from '../../lib/bytes'
import ConfirmDialog from '../ui/ConfirmDialog'
import { t } from '../../i18n'

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
      title={t('Lưu trữ bữa?')}
      tone="danger"
      confirmLabel={t('Lưu trữ bữa')}
      message={
        <>
          {t('Lưu trữ')} <strong>{mealTitle}</strong> {t('sẽ khoá chỉnh sửa vĩnh viễn và xoá')}{' '}
          {preview ? (
            <strong>
              {t('{invoices} hoá đơn cùng {files} file ảnh', {
                invoices: preview.invoiceCount,
                files: preview.fileCount,
              })}{' '}
              ({formatBytes(preview.totalFileBytes)})
            </strong>
          ) : (
            t('hoá đơn và ảnh')
          )}{' '}
          {t('để giải phóng bộ nhớ. Vẫn giữ lại chi phí từng kèo, các món và lịch sử quyết toán. Không hoàn tác được.')}
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
