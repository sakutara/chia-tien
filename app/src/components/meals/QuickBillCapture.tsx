import { Camera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { canAutoSaveReceipt } from '../../domain/quickBill'
import { parseReceipt } from '../../domain/receiptParser'
import { validateReceipt } from '../../domain/receiptValidation'
import { db } from '../../db/db'
import { getFileBlob } from '../../services/fileStorageService'
import { saveOcrText } from '../../services/invoiceFileService'
import { releaseWorkerMemory } from '../../services/memoryLifecycle'
import { OCR_MODEL_SIZE_MB, grantSessionOcrConsent, hasSessionOcrConsent, isOcrModelReady } from '../../services/ocrModelConsent'
import { runOcr } from '../../services/ocrService'
import { PeopleError } from '../../services/peopleErrors'
import { applyQuickMealDate, cancelQuickBill, saveQuickBillInvoice, startQuickBill, type QuickBillStart } from '../../services/quickBillService'
import type { Member, SessionKeo } from '../../types'
import CameraCaptureDialog from '../invoices/CameraCaptureDialog'
import InvoiceFormDialog from '../invoices/InvoiceFormDialog'
import OcrProgress from '../invoices/OcrProgress'
import { draftFromFill, fillFromReceipt } from '../invoices/receiptFormState'
import Modal from '../ui/Modal'
import { t } from '../../i18n'

interface Props {
  /** Gọi khi đã có hoá đơn trong bữa mới: mở bữa ở bước "Người". */
  onDone: (mealId: string) => void
}

interface EditState {
  start: QuickBillStart
  session: SessionKeo
  participants: Member[]
  notice?: string
}

type Phase = { name: 'idle' } | { name: 'camera' } | { name: 'working'; percent?: number; stage: string } | { name: 'edit'; edit: EditState }

const ACCEPT = 'image/jpeg,image/png,image/webp'

/**
 * Chụp bill tạo bữa nhanh (capability quick-bill-capture): chụp → tạo bữa + kèo + ảnh → quét →
 * tự lưu hoá đơn nếu đọc khớp, không thì mở form để sửa. Đóng form không lưu thì xoá bữa vừa tạo.
 */
export default function QuickBillCapture({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState<{ resolve: (ok: boolean) => void } | null>(null)
  const scanRef = useRef<AbortController | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => scanRef.current?.abort(), [])

  function openCamera() {
    setError(null)
    if (window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function') setPhase({ name: 'camera' })
    else cameraInput.current?.click()
  }

  function askConsent(): Promise<boolean> {
    if (isOcrModelReady() || hasSessionOcrConsent()) return Promise.resolve(true)
    return new Promise<boolean>((resolve) => setConsent({ resolve }))
  }

  function answerConsent(ok: boolean) {
    if (ok) grantSessionOcrConsent()
    consent?.resolve(ok)
    setConsent(null)
  }

  async function openEdit(start: QuickBillStart, notice?: string) {
    const meal = (await db.meals.get(start.meal.id)) ?? start.meal
    const session = (await db.sessions.get(start.session.id)) ?? start.session
    const participants = await db.members.where('id').anyOf(meal.participantIds).toArray()
    setPhase({ name: 'edit', edit: { start: { ...start, meal }, session, participants, notice } })
  }

  /** Đọc ảnh vừa lưu; trả về chữ OCR, hoặc lý do không đọc được để hiện trong form. */
  async function scan(start: QuickBillStart): Promise<{ text: string } | { notice: string }> {
    setPhase({ name: 'working', stage: t('Đang chuẩn bị…') })
    if (!(await askConsent())) {
      return { notice: t('Chưa tải bộ đọc chữ. Ảnh vẫn được lưu: bạn có thể nhập tay hoặc bấm "Quét lại bill" sau.') }
    }
    const controller = new AbortController()
    scanRef.current = controller
    setPhase({ name: 'working', percent: 0, stage: t('Đang chuẩn bị…') })
    try {
      const blob = await getFileBlob(start.file.id)
      if (!blob) throw new PeopleError('OCR_FAILED', t('Không đọc được dữ liệu ảnh đã lưu. Hãy xoá ảnh và chụp lại.'))
      const [text] = await runOcr([blob], {
        signal: controller.signal,
        onProgress: (percent, stage) => setPhase({ name: 'working', percent, stage }),
      })
      await saveOcrText(start.file.id, text)
      return { text }
    } catch (err) {
      if (err instanceof PeopleError && err.code === 'OCR_CANCELLED') {
        return { notice: t('Đã huỷ quét. Ảnh vẫn được lưu: bạn có thể nhập tay hoặc bấm "Quét lại bill".') }
      }
      const reason = err instanceof PeopleError ? err.message : t('Không quét được ảnh.')
      return { notice: t('{reason} Ảnh vẫn được lưu; bạn có thể bấm "Quét lại bill" hoặc nhập tay.', { reason }) }
    } finally {
      scanRef.current = null
    }
  }

  async function process(file: File) {
    setPhase({ name: 'working', stage: t('Đang lưu ảnh bill…') })
    let start: QuickBillStart
    try {
      start = await startQuickBill(file)
    } catch (err) {
      const reason = err instanceof PeopleError ? err.message : t('Không lưu được ảnh (bộ nhớ đầy hoặc trình duyệt chặn lưu).')
      setError(t('Không tạo được bữa từ ảnh này — {reason}', { reason }))
      setPhase({ name: 'idle' })
      return
    }

    const scanned = await scan(start)
    if ('notice' in scanned) {
      await openEdit(start, scanned.notice)
      return
    }

    const check = validateReceipt(parseReceipt(scanned.text), scanned.text)
    await applyQuickMealDate(start.meal.id, check.receipt.invoiceDate)
    if (canAutoSaveReceipt(check)) {
      try {
        const fill = fillFromReceipt(check.receipt)
        const saved = await saveQuickBillInvoice(start, draftFromFill(fill), fill.billTotal)
        if (saved) {
          void releaseWorkerMemory()
          setPhase({ name: 'idle' })
          onDone(start.meal.id)
          return
        }
      } catch {
        // Số đọc được không hợp lệ: để người dùng sửa trong form.
      }
    }
    await openEdit(start)
  }

  const working = phase.name === 'working'

  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary min-h-11 w-full gap-2 sm:w-auto" disabled={working || phase.name === 'edit'} onClick={openCamera}>
        <Camera className="h-5 w-5" aria-hidden="true" />
        {t('Chụp bill tạo bữa nhanh')}
      </button>
      <input
        ref={cameraInput}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="hidden"
        aria-label={t('Chụp bill tạo bữa nhanh')}
        onChange={(e) => {
          const picked = e.target.files?.[0]
          e.target.value = ''
          if (picked) void process(picked)
        }}
      />
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {phase.name === 'camera' && (
        <CameraCaptureDialog
          onClose={() => setPhase({ name: 'idle' })}
          onCapture={(file) => void process(file)}
          onUnavailable={() => {
            setPhase({ name: 'idle' })
            cameraInput.current?.click()
          }}
        />
      )}

      {working && (
        <Modal open title={t('Đang đọc bill')} onClose={() => scanRef.current?.abort()}>
          {phase.percent === undefined ? (
            <p role="status" className="text-sm text-usd-green-700">
              {phase.stage}
            </p>
          ) : (
            <OcrProgress percent={phase.percent} stage={phase.stage} onCancel={() => scanRef.current?.abort()} />
          )}
        </Modal>
      )}

      <Modal open={consent !== null} title={t('Tải bộ đọc chữ lần đầu')} onClose={() => answerConsent(false)}>
        <div className="space-y-4">
          <p className="text-sm">
            {t('Lần quét đầu tiên cần tải bộ đọc chữ khoảng {size} MB về máy. Bạn nên dùng Wi-Fi. Những lần sau không cần tải lại.', {
              size: OCR_MODEL_SIZE_MB,
            })}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary min-h-11" onClick={() => answerConsent(false)}>
              {t('Để sau')}
            </button>
            <button type="button" className="btn-primary min-h-11" data-autofocus onClick={() => answerConsent(true)}>
              {t('Tải và quét')}
            </button>
          </div>
        </div>
      </Modal>

      {phase.name === 'edit' && (
        <InvoiceFormDialog
          session={phase.edit.session}
          participants={phase.edit.participants}
          defaultPayerId={phase.edit.start.meal.hostMemberId}
          draftInvoiceId={phase.edit.start.invoiceId}
          initialNotice={phase.edit.notice}
          onSaved={() => {
            const mealId = phase.edit.start.meal.id
            setPhase({ name: 'idle' })
            onDone(mealId)
          }}
          onClose={() => {
            const mealId = phase.edit.start.meal.id
            setPhase({ name: 'idle' })
            void cancelQuickBill(mealId).catch(() => {})
          }}
        />
      )}
    </div>
  )
}
