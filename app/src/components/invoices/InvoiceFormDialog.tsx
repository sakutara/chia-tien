import { ScanText, Trash2, X } from 'lucide-react'
import { generateId } from '../../lib/id'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { computeInvoice, VENDOR_NAME_MAX, type ComputedInvoice } from '../../domain/invoiceRules'
import { parseReceipt } from '../../domain/receiptParser'
import { validateReceipt } from '../../domain/receiptValidation'
import type { InvoiceRow } from '../../hooks/useMealSessions'
import { MAX_YMD, MIN_YMD } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { getFileBlob, listFilesByInvoice } from '../../services/fileStorageService'
import {
  discardDraftFiles,
  findDuplicateImages,
  removeInvoiceImage,
  saveOcrText,
  type DuplicateImage,
} from '../../services/invoiceFileService'
import { createInvoice, updateInvoice, type InvoiceDraft, type InvoiceResult } from '../../services/invoiceService'
import { runOcr } from '../../services/ocrService'
import { PeopleError } from '../../services/peopleErrors'
import type { InvoiceFileRecord, InvoiceInputMode, InvoiceSplitType, Member, SessionKeo } from '../../types'
import Collapse from '../ui/Collapse'
import ConfirmDialog from '../ui/ConfirmDialog'
import DialogActions from '../ui/DialogActions'
import IconButton from '../ui/IconButton'
import Switch from '../ui/Switch'
import Modal from '../ui/Modal'
import InvoiceAdjustments from './InvoiceAdjustments'
import InvoiceFilesStrip from './InvoiceFilesStrip'
import InvoiceItemsEditor from './InvoiceItemsEditor'
import OcrProgress from './OcrProgress'
import {
  NO_ADJUSTMENT,
  adjustmentFrom,
  newItemRow,
  parseAdjustment,
  parseItemRows,
  parseMoneyField,
  rowFromItem,
  type AdjustmentState,
  type ItemRow,
} from './formState'
import { fillFromReceipt, hasUserEntries, type ReceiptFill } from './receiptFormState'

interface Props {
  session: SessionKeo
  /** Người đang tham gia kèo (chỉ họ mới ứng tiền và chia được). */
  participants: Member[]
  /** Người ứng mặc định: chủ trì nếu tham gia kèo, nếu không thì người đầu tiên. */
  defaultPayerId: string
  /** Hoá đơn đang sửa; bỏ trống thì tạo mới. */
  existing?: InvoiceRow
  onClose: () => void
  onSaved: (result: InvoiceResult) => void
}

const INPUT = 'field min-h-10'

/**
 * Thêm / sửa hoá đơn (BR-4.4, BR-4.5, BR-4.7…BR-4.10, BR-4.15).
 * Hai tab: nhập chi tiết món, hoặc chỉ nhập tổng tiền. Quét OCR chỉ điền vào form; chưa lưu cho tới khi bấm Lưu.
 */
export default function InvoiceFormDialog({ session, participants, defaultPayerId, existing, onClose, onSaved }: Props) {
  const invoice = existing?.invoice
  // Id tạo trước: ảnh thêm khi đang soạn gắn vào đúng hoá đơn sẽ lưu (BR-4.14).
  const [draftId] = useState(() => invoice?.id ?? generateId())
  const savedRef = useRef(false)
  const scanRef = useRef<AbortController | null>(null)

  const [inputMode, setInputMode] = useState<InvoiceInputMode>(invoice?.inputMode ?? 'ITEMIZED')
  // Cách chia (Epic 5): chỉ có ý nghĩa với ITEMIZED; TOTAL_ONLY luôn ép về EQUAL_TOTAL (BR-5.2).
  const [splitType, setSplitType] = useState<InvoiceSplitType>(invoice?.splitType ?? 'EQUAL_TOTAL')
  const [vendor, setVendor] = useState(invoice?.vendorName ?? '')
  const [vendorFromOcr, setVendorFromOcr] = useState(false)
  const [date, setDate] = useState(invoice?.invoiceDate ?? '')
  const [payer, setPayer] = useState(invoice?.payerMemberId ?? defaultPayerId)
  const [rows, setRows] = useState<ItemRow[]>(() =>
    existing?.items.length ? existing.items.map(rowFromItem) : [newItemRow()],
  )
  const [subtotal, setSubtotal] = useState(invoice ? String(invoice.subtotalAmount) : '')
  const [discount, setDiscount] = useState<AdjustmentState>(invoice ? adjustmentFrom(invoice.discountMode, invoice.discountValue) : NO_ADJUSTMENT)
  const [service, setService] = useState<AdjustmentState>(invoice ? adjustmentFrom(invoice.serviceMode, invoice.serviceValue) : NO_ADJUSTMENT)
  const [vat, setVat] = useState<AdjustmentState>(invoice ? adjustmentFrom(invoice.vatMode, invoice.vatValue) : NO_ADJUSTMENT)
  const [error, setError] = useState<string | null>(null)
  // Lỗi/cảnh báo quét OCR hiện ngay cạnh nút quét; ảnh vẫn được giữ lại.
  const [scanNotice, setScanNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [scan, setScan] = useState<{ percent: number; stage: string } | null>(null)
  const [billTotal, setBillTotal] = useState<number | undefined>(undefined)
  const [ocrCheck, setOcrCheck] = useState<ReceiptFill['check'] | null>(null)
  const [pendingFill, setPendingFill] = useState<ReceiptFill | null>(null)
  const images = useLiveQuery(() => listFilesByInvoice(draftId), [draftId])
  const imageCount = images?.length ?? 0
  const [duplicates, setDuplicates] = useState<Array<DuplicateImage & { file: InvoiceFileRecord }>>([])

  // Đóng form: dừng quét đang chạy, và bỏ ảnh tạm của hoá đơn chưa lưu.
  useEffect(
    () => () => {
      scanRef.current?.abort()
      if (!savedRef.current) void discardDraftFiles(draftId).catch(() => {})
    },
    [draftId],
  )

  const payerOptions = participants.filter((m) => session.participantIds.includes(m.id))

  /** Đổi trạng thái ô nhập sang dữ liệu hoá đơn; ném lỗi nếu có ô sai. */
  function buildDraft(): InvoiceDraft {
    return {
      id: draftId,
      sessionId: session.id,
      payerMemberId: payer,
      inputMode,
      splitType: inputMode === 'TOTAL_ONLY' ? 'EQUAL_TOTAL' : splitType,
      vendorName: vendor,
      invoiceDate: date || undefined,
      items: inputMode === 'ITEMIZED' ? parseItemRows(rows) : [],
      subtotalAmount: inputMode === 'TOTAL_ONLY' ? parseMoneyField(subtotal, 'Tiền hàng') : undefined,
      discount: parseAdjustment(discount, 'Giảm giá'),
      service: parseAdjustment(service, 'Phí phục vụ'),
      vat: parseAdjustment(vat, 'VAT'),
      autoNameSession: vendorFromOcr,
    }
  }

  // Xem trước tổng: chỉ hiện khi dữ liệu đủ; nếu chưa đủ thì ghi lý do.
  let preview: ComputedInvoice | null = null
  let previewIssue: string | null = null
  try {
    preview = computeInvoice(buildDraft())
  } catch (err) {
    previewIssue = err instanceof PeopleError ? err.message : null
  }

  /** Điền kết quả quét vào form (chưa lưu). Chỉ đụng tới trường mà bill có dữ liệu. */
  function applyFill(fill: ReceiptFill) {
    if (fill.vendorName) {
      setVendor(fill.vendorName)
      setVendorFromOcr(true)
    }
    if (fill.invoiceDate) setDate(fill.invoiceDate)
    if (fill.rows) {
      setRows(fill.rows)
      setInputMode('ITEMIZED')
    }
    if (fill.discount) setDiscount(fill.discount)
    if (fill.service) setService(fill.service)
    if (fill.vat) setVat(fill.vat)
    setBillTotal(fill.billTotal)
    setOcrCheck(fill.check ?? null)
  }

  /**
   * Quét OCR các ảnh của hoá đơn rồi điền vào form (BR-4.7, BR-4.17).
   * Chỉ quét ảnh chưa có văn bản OCR (kết quả đã lưu được dùng lại); `force` quét lại tất cả.
   * Sau khi quét, báo ảnh trùng với ảnh đã có trong bữa (BR-4.18).
   */
  async function scanImages(force = false) {
    setScanNotice(null)
    const files = await listFilesByInvoice(draftId)
    if (files.length === 0) {
      setScanNotice('Chưa có ảnh để quét. Hãy chụp hoặc tải ảnh bill trước.')
      return
    }
    const targets = force ? files : files.filter((f) => f.ocrRawText === undefined)

    const controller = new AbortController()
    scanRef.current = controller
    setScan({ percent: 0, stage: 'Đang chuẩn bị…' })
    try {
      if (targets.length > 0) {
        const pairs: Array<{ id: string; blob: Blob }> = []
        for (const file of targets) {
          const blob = await getFileBlob(file.id)
          if (blob) pairs.push({ id: file.id, blob })
        }
        if (pairs.length === 0) {
          throw new PeopleError('OCR_FAILED', 'Không đọc được dữ liệu ảnh đã lưu. Hãy xoá ảnh và chụp lại.')
        }
        const texts = await runOcr(
          pairs.map((p) => p.blob),
          { signal: controller.signal, onProgress: (percent, stage) => setScan({ percent, stage }) },
        )
        await Promise.all(pairs.map((p, i) => saveOcrText(p.id, texts[i])))
      }

      // Ảnh vừa quét trùng với ảnh nào đã có thì báo để người dùng xoá bớt.
      const found: Array<DuplicateImage & { file: InvoiceFileRecord }> = []
      for (const file of targets) {
        for (const dup of await findDuplicateImages(file.id)) found.push({ ...dup, file })
      }
      setDuplicates(found)

      // Ảnh trùng với ảnh cùng hoá đơn thì dữ liệu đã được điền từ ảnh gốc: không điền lại.
      const skipFill = targets.length > 0 && targets.every((t) => found.some((d) => d.file.id === t.id && d.sameInvoice))
      if (skipFill) return

      const fresh = await listFilesByInvoice(draftId)
      // Đối chiếu SL × đơn giá = thành tiền và tổng bill (gồm giảm giá, phí phục vụ, VAT) trước khi điền vào danh sách món.
      const rawText = fresh.map((f) => f.ocrRawText ?? '').join('\n')
      const check = validateReceipt(parseReceipt(rawText), rawText)
      const fill = fillFromReceipt(check.receipt)
      if (Object.keys(fill).length === 0) {
        setScanNotice('Đã lưu ảnh nhưng không nhận ra chữ nào trên bill. Hãy chụp lại rõ hơn (đủ sáng, thẳng, không rung) hoặc nhập tay.')
        return
      }
      fill.check = { status: check.status, notes: check.notes }
      const hasData = hasUserEntries({ vendorName: vendor, invoiceDate: date, rows, subtotal, discount, service, vat })
      if (hasData) setPendingFill(fill)
      else applyFill(fill)
    } catch (err) {
      if (err instanceof PeopleError && err.code === 'OCR_CANCELLED') return
      const reason = err instanceof PeopleError ? err.message : 'Không quét được ảnh.'
      setScanNotice(`${reason} Ảnh vẫn được lưu; bạn có thể bấm "Quét lại bill" hoặc nhập tay.`)
    } finally {
      scanRef.current = null
      setScan(null)
    }
  }

  async function removeDuplicate(file: InvoiceFileRecord) {
    try {
      await removeInvoiceImage(file.id)
      setDuplicates((list) => list.filter((d) => d.file.id !== file.id))
    } catch (err) {
      setError(err instanceof PeopleError ? err.message : 'Không xoá được ảnh.')
    }
  }

  // Chỉ hiện thông báo cho ảnh còn tồn tại (người dùng có thể đã xoá bằng nút khác).
  const liveDuplicates = duplicates.filter((d) => images?.some((img) => img.id === d.file.id))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const draft = buildDraft()
      const result = invoice
        ? await updateInvoice(invoice.id, draft)
        : await createInvoice(draft)
      savedRef.current = true
      onSaved(result)
    } catch (err) {
      setError(err instanceof PeopleError ? err.message : 'Có lỗi không xác định.')
    } finally {
      setSaving(false)
    }
  }

  // Cảnh báo không chặn lưu khi tổng tính được khác tổng ghi trên bill (R-11).
  const billMismatch =
    preview && billTotal !== undefined && preview.bill.totalAmount !== billTotal
      ? `Tổng tính được ${formatMoney(preview.bill.totalAmount)} lệch tổng ghi trên bill ${formatMoney(billTotal)}. Hãy kiểm tra giảm giá, phí phục vụ hoặc VAT.`
      : null

  // Công tắc "chi tiết món" chỉ hiện khi hoá đơn nhập tay (chưa có ảnh); hoá đơn có ảnh luôn đọc ra món.
  const manual = imageCount === 0 || inputMode === 'TOTAL_ONLY'
  const itemized = inputMode === 'ITEMIZED'
  const hasAdjustment = discount.mode !== 'NONE' || service.mode !== 'NONE' || vat.mode !== 'NONE'

  return (
    <>
      <Modal open title={invoice ? 'Sửa hoá đơn' : 'Thêm hoá đơn'} onClose={onClose} size="lg">
        <form onSubmit={submit} className="space-y-3" noValidate>
          <InvoiceFilesStrip
            invoiceId={draftId}
            mealId={session.mealId}
            sessionId={session.id}
            disabled={scan !== null}
            onAdded={() => void scanImages()}
            actions={
              <IconButton
                icon={ScanText}
                label="Quét lại bill (OCR)"
                tone="outline"
                disabled={scan !== null || imageCount === 0}
                onClick={() => void scanImages(true)}
              />
            }
          />

          {scan && <OcrProgress percent={scan.percent} stage={scan.stage} onCancel={() => scanRef.current?.abort()} />}

          {liveDuplicates.map((d) => (
            <div key={d.file.id} role="alert" className="flex items-start gap-2 rounded-lg border border-amber-600 bg-amber-50 p-2 text-sm">
              <p className="min-w-0 flex-1 text-amber-900">
                Ảnh <strong>{d.file.fileName}</strong> có vẻ trùng với ảnh <strong>{d.duplicateOf.fileName}</strong>{' '}
                ({d.sameInvoice ? 'cùng hoá đơn này' : 'đã có ở hoá đơn khác trong bữa'}, giống {Math.round(d.similarity * 100)}%).
              </p>
              <IconButton icon={Trash2} label="Xoá ảnh trùng" tone="danger" onClick={() => void removeDuplicate(d.file)} />
              <IconButton
                icon={X}
                label="Giữ lại"
                onClick={() => setDuplicates((list) => list.filter((x) => x.file.id !== d.file.id))}
              />
            </div>
          ))}

          {scanNotice && (
            <p role="alert" className="rounded-lg border border-amber-600 bg-amber-50 p-2 text-sm text-amber-900">
              {scanNotice}
            </p>
          )}
          {ocrCheck && ocrCheck.notes.length > 0 && (
            <div
              role={ocrCheck.status === 'MISMATCH' ? 'alert' : 'status'}
              className={`space-y-1 rounded-lg border p-2 text-sm ${
                ocrCheck.status === 'OK'
                  ? 'border-usd-green-700 bg-usd-paper-100 text-usd-green-900'
                  : 'border-amber-600 bg-amber-50 text-amber-900'
              }`}
            >
              {ocrCheck.notes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label htmlFor="invoice-vendor" className="mb-0.5 block text-xs font-medium text-usd-green-700">Quán</label>
              <input
                id="invoice-vendor"
                data-autofocus
                value={vendor}
                maxLength={VENDOR_NAME_MAX}
                onChange={(e) => {
                  setVendor(e.target.value)
                  setVendorFromOcr(false)
                }}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="invoice-date" className="mb-0.5 block text-xs font-medium text-usd-green-700">Ngày</label>
              <input id="invoice-date" type="date" min={MIN_YMD} max={MAX_YMD} value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="invoice-payer" className="mb-0.5 block text-xs font-medium text-usd-green-700">Ứng</label>
              <select id="invoice-payer" value={payer} onChange={(e) => setPayer(e.target.value)} className={INPUT}>
                {payerOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {manual && (
              <Switch label="Nhập chi tiết món" checked={itemized} onChange={(on) => setInputMode(on ? 'ITEMIZED' : 'TOTAL_ONLY')} />
            )}
            {itemized ? (
              <Switch label="Chia từng món" checked={splitType === 'BY_ITEM'} onChange={(on) => setSplitType(on ? 'BY_ITEM' : 'EQUAL_TOTAL')} />
            ) : (
              <span className="text-xs text-usd-green-700">Chỉ nhập tổng: luôn chia đều theo tổng.</span>
            )}
          </div>

          {itemized ? (
            <section aria-label="Danh sách món" className="space-y-1.5">
              <InvoiceItemsEditor rows={rows} onChange={setRows} />
            </section>
          ) : (
            <div>
              <label htmlFor="invoice-subtotal" className="mb-0.5 block text-xs font-medium text-usd-green-700">
                Tiền hàng (trước giảm giá, phí, VAT)
              </label>
              <input id="invoice-subtotal" inputMode="numeric" value={subtotal} placeholder="VD: 1.620.000" onChange={(e) => setSubtotal(e.target.value)} className={INPUT} />
            </div>
          )}

          <Collapse title={hasAdjustment ? 'Giảm giá, phí phục vụ, VAT (đã nhập)' : 'Giảm giá, phí phục vụ, VAT'} label="Điều chỉnh" defaultOpen={hasAdjustment}>
            <section aria-label="Điều chỉnh" className="grid gap-2 md:grid-cols-3">
              <InvoiceAdjustments label="Giảm giá" idBase="discount" value={discount} onChange={setDiscount} />
              <InvoiceAdjustments label="Phí phục vụ" idBase="service" value={service} onChange={setService} />
              <InvoiceAdjustments label="VAT" idBase="vat" value={vat} onChange={setVat} />
            </section>
          </Collapse>

          <section aria-label="Tổng hoá đơn" className="money space-y-0.5 rounded-lg bg-usd-paper-100 px-3 py-2 text-sm">
            {preview ? (
              <>
                {(preview.bill.discountAmount > 0 || preview.bill.serviceAmount > 0 || preview.bill.vatAmount > 0) && (
                  <p className="text-xs text-usd-green-700">
                    Tiền hàng {formatMoney(preview.subtotalAmount)}
                    {preview.bill.discountAmount > 0 && ` · Giảm −${formatMoney(preview.bill.discountAmount)}`}
                    {preview.bill.serviceAmount > 0 && ` · Phí +${formatMoney(preview.bill.serviceAmount)}`}
                    {preview.bill.vatAmount > 0 && ` · VAT +${formatMoney(preview.bill.vatAmount)}`}
                  </p>
                )}
                <p className="text-base font-bold">Tổng: {formatMoney(preview.bill.totalAmount)}</p>
                {billTotal !== undefined && <p className="text-xs text-usd-green-700">Ghi trên bill: {formatMoney(billTotal)}</p>}
              </>
            ) : (
              <p className="text-usd-green-700">{previewIssue ?? 'Nhập món hoặc tiền hàng để xem tổng.'}</p>
            )}
            {billMismatch && <p role="status" className="text-amber-800">{billMismatch}</p>}
          </section>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          <DialogActions onCancel={onClose} saveLabel="Lưu hoá đơn" saving={saving} />
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingFill !== null}
        title="Ghi đè dữ liệu đã nhập?"
        message="Kết quả quét sẽ thay các ô đã nhập trong hoá đơn này. Bạn có chắc không?"
        confirmLabel="Ghi đè"
        tone="danger"
        onConfirm={() => {
          if (pendingFill) applyFill(pendingFill)
          setPendingFill(null)
        }}
        onCancel={() => setPendingFill(null)}
      />
    </>
  )
}
