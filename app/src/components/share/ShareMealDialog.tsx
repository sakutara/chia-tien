import { Check, Copy, Download, Image as ImageIcon, Link2, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { slidesFromPayments } from '../../domain/paymentSlides'
import { renderPaymentsPng } from '../../lib/paymentImage'
import { formatEntityShareLabel, formatShareMessage, hostRecipientLabels } from '../../domain/shareSnapshot'
import { PeopleError } from '../../services/peopleErrors'
import { buildShareTargets, canShareFile, canUseWebShare, copyTextToClipboard, downloadBlob, loadMealSnapshotPayload, scopeSnapshot, shareFileViaOs, shareMessageViaOs, shortenSnapshotUrl, type LoadedMealSnapshot } from '../../services/snapshotService'
import IconButton from '../ui/IconButton'
import Modal from '../ui/Modal'
import ToggleButton from '../ui/ToggleButton'
import { t } from '../../i18n'

interface Props {
  mealId: string
  onClose: () => void
}

/** URL dài hơn ngưỡng này có thể bị ứng dụng chat cắt (BR-8 rủi ro 3). */
const LONG_URL_WARNING = 4000

const errorText = (err: unknown) => (err instanceof PeopleError ? err.message : t('Có lỗi không xác định.'))

/**
 * Hộp thoại chia sẻ thanh toán (BR-8.6): gửi link snapshot (tin nhắn + Facebook/Zalo) hoặc gửi ảnh PNG
 * của mục chia tiền (các thẻ QR, không có tiêu đề và thanh tab).
 */
export default function ShareMealDialog({ mealId, onClose }: Props) {
  const [loaded, setLoaded] = useState<LoadedMealSnapshot | null>(null)
  // false = gửi link, true = gửi QR (ảnh PNG).
  const [sendQr, setSendQr] = useState(false)
  const [qrImage, setQrImage] = useState<{ blob: Blob; url: string } | null>(null)
  // null = gửi cho tất cả; mảng = chỉ những thực thể được chọn.
  const [recipients, setRecipients] = useState<string[] | null>(null)
  const [copied, setCopied] = useState<'ALL' | 'LINK' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadMealSnapshotPayload(mealId)
      .then((result) => {
        if (alive) setLoaded(result)
      })
      .catch((err) => {
        if (alive) setError(errorText(err))
      })
    return () => {
      alive = false
    }
  }, [mealId])

  // Sau 2 giây nút sao chép trở lại nhãn ban đầu (R-5).
  useEffect(() => {
    if (copied === null) return
    const timer = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  // Dựng ảnh PNG khi chọn gửi QR; dựng lại khi đổi người nhận.
  const payments = useMemo(() => {
    if (!loaded) return null
    const debtorIds = [...new Set(loaded.settlement.transfers.map((tr) => tr.fromEntityId))]
    const subset = recipients !== null && recipients.length > 0 && recipients.length < debtorIds.length ? recipients : null
    return scopeSnapshot(loaded.data, subset).payload.payments ?? []
  }, [loaded, recipients])

  useEffect(() => {
    if (!sendQr || !payments) return
    let alive = true
    let url: string | null = null
    renderPaymentsPng(slidesFromPayments(payments))
      .then((blob) => {
        if (!alive) return
        url = URL.createObjectURL(blob)
        setQrImage({ blob, url })
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : t('Không tạo được ảnh QR.'))
      })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
      setQrImage(null)
    }
  }, [sendQr, payments])

  if (!loaded) {
    return (
      <Modal open title={t('Chia sẻ thông báo thanh toán')} onClose={onClose}>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-usd-green-700">{t('Đang tạo tin nhắn…')}</p>}
      </Modal>
    )
  }

  const { settlement } = loaded
  const debtorIds = [...new Set(settlement.transfers.map((t) => t.fromEntityId))]
  const debtors = debtorIds.map((id) => settlement.entities.find((e) => e.entityId === id)).filter((e) => e !== undefined)
  const subset = recipients !== null && recipients.length > 0 && recipients.length < debtors.length ? recipients : null
  // Snapshot chỉ chứa khoản chuyển của những người được chọn; người nhận link không xem được phần của người khác.
  // Link dùng đúng dạng đã tạo trước đây: chỉ các khoản chuyển tiền của người được chọn.
  const { payload, snapshotUrl } = scopeSnapshot(loaded.data, subset)
  const nameById = new Map(payload.members.map((m) => [m.id, m.name] as const))
  const message = formatShareMessage({
    mealTitle: payload.meal.title,
    entities: settlement.entities,
    transfers: settlement.transfers,
    snapshotUrl,
    onlyEntityIds: subset ?? undefined,
    recipientLabelByEntityId:
      settlement.settlementMode === 'HOST_MEDIATED'
        ? hostRecipientLabels(settlement.entities, payload.meal.hostMemberId, nameById)
        : undefined,
  })

  // Bản xem trước chỉ hiện link rút gọn; nội dung sao chép/chia sẻ vẫn chứa link đầy đủ.
  const previewMessage = message.endsWith(snapshotUrl) ? message.slice(0, -snapshotUrl.length) + shortenSnapshotUrl(snapshotUrl) : message

  async function shareOs() {
    setError(null)
    try {
      await shareMessageViaOs({ title: payload.meal.title, text: message })
    } catch (err) {
      setError(errorText(err))
    }
  }

  const pngFile = qrImage ? new File([qrImage.blob], `${payload.meal.title.trim() || 'chia-tien'}.png`, { type: 'image/png' }) : null

  async function shareImage() {
    if (!pngFile) return
    setError(null)
    try {
      await shareFileViaOs({ title: payload.meal.title, file: pngFile })
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function copy(text: string, which: 'ALL' | 'LINK') {
    setError(null)
    try {
      await copyTextToClipboard(text)
      setCopied(which)
    } catch (err) {
      setError(errorText(err))
    }
  }

  return (
    <Modal open title={t('Chia sẻ thông báo thanh toán')} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <ToggleButton checked={sendQr} onChange={setSendQr} label={t('Gửi QR')} uncheckedLabel={t('Gửi link')} />

        {debtors.length > 1 && (
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-xs text-usd-green-700">{t('Gửi cho (link chỉ chứa thanh toán của người được chọn)')}</legend>
            <div role="radiogroup" aria-label={t('Gửi cho')} className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={subset === null}
                onClick={() => setRecipients(null)}
                className={`min-h-9 rounded-full border px-3 ${subset === null ? 'border-usd-green-700 bg-usd-green-100 font-semibold' : 'border-usd-paper-200 bg-white'}`}
              >
                {t('Tất cả')}
              </button>
              {debtors.map((e) => {
                const on = subset?.includes(e.entityId) ?? false
                return (
                  <button
                    key={e.entityId}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRecipients([e.entityId])}
                    className={`min-h-9 rounded-full border px-3 ${on ? 'border-usd-green-700 bg-usd-green-100 font-semibold' : 'border-usd-paper-200 bg-white'}`}
                  >
                    {formatEntityShareLabel(e)}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {!sendQr ? (
          <>
            <div>
              <pre className="whitespace-pre-wrap break-words rounded-lg border border-usd-paper-200 bg-usd-paper-50 p-3 font-sans select-text" aria-label={t('Nội dung tin nhắn')}>
                {previewMessage}
              </pre>
            </div>

            {snapshotUrl.length > LONG_URL_WARNING && (
              <p role="status" className="rounded-lg border border-amber-600 bg-amber-50 p-2 text-amber-900">
                {t('Link khá dài nên có thể bị cắt khi gửi. Hãy dùng ứng dụng chat hỗ trợ tin nhắn dài.')}
              </p>
            )}

            <div className="flex items-center justify-end gap-2" role="group" aria-label={t('Chia sẻ')}>
              {copied && (
                <span role="status" className="mr-auto inline-flex items-center gap-1 text-xs text-usd-green-800">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('Đã sao chép')}
                </span>
              )}
              <IconButton icon={Copy} label={t('Sao chép toàn bộ tin nhắn')} tone={canUseWebShare() ? 'outline' : 'primary'} onClick={() => void copy(message, 'ALL')} />
              <IconButton icon={Link2} label={t('Chỉ sao chép Link Snapshot')} tone="outline" onClick={() => void copy(snapshotUrl, 'LINK')} />
              {canUseWebShare() && <IconButton icon={Share2} label={t('Chia sẻ qua ứng dụng khác')} tone="primary" onClick={() => void shareOs()} />}
            </div>

            <div>
              <p className="mb-1 text-xs text-usd-green-700">{t('Gửi nhanh qua')}</p>
              <div className="flex flex-wrap gap-2">
                {buildShareTargets(snapshotUrl).map((target) => (
                  <a key={target.id} href={target.href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    {target.label}
                  </a>
                ))}
              </div>
              {!canUseWebShare() && (
                <p className="mt-1 text-xs text-usd-green-700">{t('Trình duyệt chưa hỗ trợ menu chia sẻ hệ thống (cần HTTPS), nên dùng các nút trên hoặc sao chép.')}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex min-h-24 items-center justify-center rounded-lg border border-usd-paper-200 bg-usd-paper-50 p-2">
              {qrImage ? (
                <img src={qrImage.url} alt={t('Ảnh QR chia tiền')} className="max-h-[50dvh] w-auto max-w-full rounded" />
              ) : (
                <p className="text-usd-green-700">{t('Đang tạo ảnh…')}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2" role="group" aria-label={t('Chia sẻ')}>
              <ImageIcon className="mr-auto h-4 w-4 text-usd-green-700" aria-hidden="true" />
              <IconButton
                icon={Download}
                label={t('Tải ảnh QR (PNG)')}
                tone={pngFile && canShareFile(pngFile) ? 'outline' : 'primary'}
                disabled={!pngFile}
                onClick={() => pngFile && downloadBlob(pngFile, pngFile.name)}
              />
              {pngFile && canShareFile(pngFile) && <IconButton icon={Share2} label={t('Chia sẻ ảnh QR')} tone="primary" onClick={() => void shareImage()} />}
            </div>
            <p className="text-xs text-usd-green-700">{t('Tải ảnh rồi gửi trong Facebook hoặc Zalo.')}</p>
          </>
        )}

                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}
