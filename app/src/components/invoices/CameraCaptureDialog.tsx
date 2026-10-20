import { Camera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import { t } from '../../i18n'

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
  /** Camera không dùng được (bị từ chối quyền, không có camera): dùng ứng dụng camera của máy thay thế. */
  onUnavailable: () => void
}

/** Camera chạy ngay trong trang: không rời khỏi app nên điện thoại ít RAM không giải phóng trang khi chụp. */
export default function CameraCaptureDialog({ onCapture, onClose, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          void video.play().then(() => setReady(true)).catch(() => setReady(true))
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('Không mở được camera trong app (chưa cấp quyền?). Dùng camera của máy.'))
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function snap() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(t('Không chụp được ảnh. Hãy thử lại.'))
          return
        }
        onCapture(new File([blob], `bill-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <Modal open title={t('Chụp ảnh hoá đơn')} onClose={onClose}>
      <div className="space-y-3">
        <video ref={videoRef} playsInline muted className="max-h-[60vh] w-full rounded-lg bg-black object-contain" />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary min-h-11" onClick={onClose}>
            {t('Huỷ')}
          </button>
          {error ? (
            <button type="button" className="btn-primary min-h-11" onClick={onUnavailable}>
              {t('Dùng camera của máy')}
            </button>
          ) : (
            <button type="button" data-autofocus className="btn-primary min-h-11" disabled={!ready} onClick={snap}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {t('Chụp')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
