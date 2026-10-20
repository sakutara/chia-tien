import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadFile, getFileBlob } from '../../services/fileStorageService'
import Modal from '../ui/Modal'
import { t } from '../../i18n'

interface Props {
  fileId: string
  fileName: string
  onClose: () => void
}

/** Xem ảnh hoá đơn đã lưu, và tải về (BR-4.6). */
export default function ImageViewerDialog({ fileId, fileName, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  // Esc chỉ đóng trình xem, không đóng form hoá đơn đang mở bên dưới.
  // Chặn ở pha capture trên window và huỷ mặc định, để dialog cha không nhận yêu cầu đóng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    getFileBlob(fileId).then((blob) => {
      if (cancelled) return
      if (!blob) {
        setMissing(true)
        return
      }
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  return (
    <Modal open title={fileName} onClose={onClose}>
      <div className="space-y-3">
        {missing && <p role="alert" className="text-sm text-red-700">{t('Không còn dữ liệu ảnh này.')}</p>}
        {!missing && !url && <p className="text-sm text-usd-green-700">{t('Đang mở ảnh…')}</p>}
        {url && <img src={url} alt={t('Ảnh hoá đơn {fileName}', { fileName })} className="max-h-[70vh] w-full rounded-lg object-contain" />}
        <div className="flex justify-end">
          <button type="button" className="btn-secondary min-h-11" onClick={() => void downloadFile(fileId)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('Tải về')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
