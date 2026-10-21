import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Download, Eye, ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { planCompression } from '../../domain/imageQuality'
import { formatBytes } from '../../lib/bytes'
import { probeImage } from '../../lib/imageCompress'
import { isPdfFile } from '../../lib/pdfImport'
import { downloadFile, getFileBlob, listFilesByInvoice } from '../../services/fileStorageService'
import {
  addInvoiceImage,
  addInvoicePdf,
  IMAGE_COMPRESSION,
  MAX_IMAGES_PER_INVOICE,
  removeInvoiceImage,
} from '../../services/invoiceFileService'
import { PeopleError } from '../../services/peopleErrors'
import type { InvoiceFileRecord } from '../../types'
import ConfirmDialog from '../ui/ConfirmDialog'
import IconButton from '../ui/IconButton'
import CameraCaptureDialog from './CameraCaptureDialog'
import ImageViewerDialog from './ImageViewerDialog'
import { t } from '../../i18n'

interface Props {
  /** Id của hoá đơn đã lưu hoặc id tạo trước của hoá đơn đang soạn. */
  invoiceId: string
  mealId: string
  sessionId: string
  /** Khoá thao tác thêm ảnh (ví dụ đang quét OCR). */
  disabled?: boolean
  /**
   * Gọi sau khi một đợt ảnh đã được lưu. `via` = 'ai' khi ảnh được chọn từ luồng "Đọc bill bằng AI" (chỉ đọc bằng AI,
   * OCR chỉ là dự phòng); ngược lại 'ocr' để form tự quét OCR những ảnh mới (BR-4.17).
   */
  onAdded: (fileIds: string[], via: 'ocr' | 'ai') => void
  /** Cho form mở chụp/chọn ảnh từ bên ngoài (luồng AI khi chưa có ảnh). */
  controlRef?: Ref<FilesStripControl>
  /** Nút phụ cạnh nút chụp/tải (ví dụ quét lại OCR). */
  actions?: React.ReactNode
}

export interface FilesStripControl {
  /** Mở chụp ảnh hoặc chọn tệp; ảnh thêm vào sẽ báo `onAdded(…, 'ai')`. */
  pickForAi: (source: 'camera' | 'gallery') => void
}

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

/** Dung lượng: "4,2 MB → 0,8 MB" khi đã nén, hoặc chỉ dung lượng khi không nén. */
function sizeLabel(file: InvoiceFileRecord): string {
  if (file.originalSizeBytes && file.originalSizeBytes !== file.sizeBytes) {
    return `${formatBytes(file.originalSizeBytes)} → ${formatBytes(file.sizeBytes)}`
  }
  return formatBytes(file.sizeBytes)
}

/** Ảnh nhỏ xem trước; tự giải phóng URL khi rời khỏi màn. */
function Thumb({ fileId, alt }: { fileId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    getFileBlob(fileId).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])
  return url ? (
    <img src={url} alt={alt} className="h-10 w-8 shrink-0 rounded object-cover" />
  ) : (
    <div className="h-10 w-8 shrink-0 rounded bg-usd-paper-200" aria-hidden="true" />
  )
}

/**
 * Ảnh của một hoá đơn: chụp hoặc tải lên, xem/tải/xoá từng ảnh (BR-4.6).
 * Mọi ảnh được nén ở mức Cân bằng (BR-4.16) và lưu ngay khi thêm; hoá đơn đang soạn bỏ đi thì ảnh tạm được dọn khi đóng form.
 */
export default function InvoiceFilesStrip({ invoiceId, mealId, sessionId, disabled, onAdded, actions, controlRef }: Props) {
  const files = useLiveQuery(() => listFilesByInvoice(invoiceId), [invoiceId])
  const [sample, setSample] = useState<{ width: number; height: number; bytes: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyText, setBusyText] = useState('')
  // Lỗi thêm ảnh hiện ngay tại đây (không đẩy xuống cuối form nơi người dùng không thấy).
  const [problems, setProblems] = useState<string[]>([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [viewing, setViewing] = useState<InvoiceFileRecord | null>(null)
  const [removing, setRemoving] = useState<InvoiceFileRecord | null>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  // Đặt khi ảnh được chọn từ luồng AI; mọi thao tác chọn ảnh trực tiếp trên các nút của khung này đặt lại về false.
  const aiPick = useRef(false)
  const openGallery = () => {
    aiPick.current = false
    galleryInput.current?.click()
  }
  useImperativeHandle(controlRef, () => ({
    pickForAi: (source) => {
      if (source === 'camera') openCamera()
      else galleryInput.current?.click()
      aiPick.current = true
    },
  }))

  const count = files?.length ?? 0
  const locked = busy || disabled === true
  const full = count >= MAX_IMAGES_PER_INVOICE
  const warnings = sample ? planCompression(sample.width, sample.height, sample.bytes, IMAGE_COMPRESSION).warnings : []

  /** Ưu tiên camera trong trang (không rời app); không có thì mở ứng dụng camera của máy. */
  function openCamera() {
    aiPick.current = false
    if (window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function') setCameraOpen(true)
    else cameraInput.current?.click()
  }

  function handleFiles(list: FileList | null) {
    if (list) void addPicked(Array.from(list))
  }

  async function addPicked(picked: File[]) {
    if (picked.length === 0) return
    setBusy(true)
    setProblems([])
    const added: string[] = []
    const failed: string[] = []
    try {
      const first = picked.find((f) => !isPdfFile(f)) ?? picked[0]
      try {
        if (isPdfFile(first)) throw new Error('pdf')
        const dims = await probeImage(first)
        setSample({ ...dims, bytes: first.size })
      } catch {
        setSample(null)
      }
      // Một ảnh lỗi không làm mất các ảnh còn lại.
      for (const file of picked) {
        try {
          if (isPdfFile(file)) {
            setBusyText(t('Đang đọc PDF…'))
            const result = await addInvoicePdf({ mealId, sessionId, invoiceId, file })
            added.push(...result.records.map((r) => r.id))
            if (result.truncated) {
              failed.push(t('{v}: PDF có {total} trang, chỉ nhận {n} trang đầu (mỗi hoá đơn tối đa {max} ảnh).', { v: file.name, total: result.totalPages, n: result.records.length, max: MAX_IMAGES_PER_INVOICE }))
            }
          } else {
            setBusyText(t('Đang nén và lưu ảnh…'))
            const record = await addInvoiceImage({ mealId, sessionId, invoiceId, file })
            added.push(record.id)
          }
        } catch (err) {
          const reason = err instanceof PeopleError ? err.message : t('Không lưu được ảnh (bộ nhớ đầy hoặc trình duyệt chặn lưu).')
          failed.push(t('{v}: {reason}', { v: file.name || t('Ảnh vừa chụp'), reason }))
        }
      }
    } finally {
      setBusy(false)
      if (galleryInput.current) galleryInput.current.value = ''
      if (cameraInput.current) cameraInput.current.value = ''
      if (failed.length > 0) setProblems(failed)
      const via = aiPick.current ? 'ai' : 'ocr'
      aiPick.current = false
      if (added.length > 0) onAdded(added, via)
    }
  }

  return (
    <section aria-label={t('Ảnh hoá đơn')} className="space-y-2 rounded-xl border border-dashed border-usd-green-600/60 bg-usd-green-100/30 p-2.5">
      <div className="flex items-center gap-2">
        <IconButton icon={Camera} label={t('Chụp ảnh')} tone="primary" disabled={locked || full} onClick={openCamera} />
        <IconButton icon={ImagePlus} label={t('Tải ảnh hoặc PDF lên')} tone="outline" disabled={locked || full} onClick={openGallery} />
        {actions}
        <span className="ml-auto text-xs text-usd-green-700" title={t('Ảnh được lọc cho dễ đọc, lưu khoảng 1 MB và tự quét nội dung sau khi lưu')}>
          {count === 0 ? t('Chụp hoặc tải ảnh/PDF bill') : t('{count}/{MAX_IMAGES_PER_INVOICE} ảnh', { count, MAX_IMAGES_PER_INVOICE })}
        </span>
      </div>

      <input
        ref={galleryInput}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        aria-label={t('Tải ảnh hoặc PDF lên')}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraInput}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="hidden"
        aria-label={t('Chụp ảnh hoá đơn')}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {warnings.map((w) => (
        <p key={w} role="status" className="text-sm text-amber-800">
          {w}
        </p>
      ))}

      {busy && <p className="text-sm text-usd-green-700">{busyText || t('Đang nén và lưu ảnh…')}</p>}
      {problems.map((p) => (
        <p key={p} role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {t('Không thêm được ảnh — {p}', { p })}
        </p>
      ))}

      {count > 0 && (
        <ul className="space-y-1.5">
          {files?.map((file, i) => (
            <li key={file.id} className="flex items-center gap-2 rounded-lg border border-usd-paper-200 bg-white/60 px-2 py-1 text-sm">
              <Thumb fileId={file.id} alt={t('Ảnh {v}', { v: i + 1 })} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.fileName}</p>
                <p className="text-xs text-usd-green-700">
                  {sizeLabel(file)}
                  {file.ocrRawText !== undefined && t(' · đã quét')}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton icon={Eye} label={`Xem ${file.fileName}`} onClick={() => setViewing(file)} />
                <IconButton icon={Download} label={t('Tải {fileName}', { fileName: file.fileName })} onClick={() => void downloadFile(file.id)} />
                <IconButton icon={Trash2} label={t('Xoá {fileName}', { fileName: file.fileName })} tone="danger" onClick={() => setRemoving(file)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {cameraOpen && (
        <CameraCaptureDialog
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false)
            void addPicked([file])
          }}
          onUnavailable={() => {
            setCameraOpen(false)
            cameraInput.current?.click()
          }}
        />
      )}
      {viewing && <ImageViewerDialog fileId={viewing.id} fileName={viewing.fileName} onClose={() => setViewing(null)} />}
      <ConfirmDialog
        open={removing !== null}
        title={t('Xoá ảnh này?')}
        message={<>{t('Ảnh')} <strong>{removing?.fileName}</strong> {t('sẽ bị xoá khỏi bộ nhớ. Không hoàn tác được.')}</>}
        confirmLabel={t('Xoá ảnh')}
        tone="danger"
        onConfirm={async () => {
          if (removing) await removeInvoiceImage(removing.id)
          setRemoving(null)
        }}
        onCancel={() => setRemoving(null)}
      />
    </section>
  )
}
