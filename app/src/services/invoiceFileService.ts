import { db } from '../db/db'
import { compressImage } from '../lib/imageCompress'
import { scanReceiptImage } from '../lib/imageScan'
import { importPdf, isPdfFile } from '../lib/pdfImport'
import { findTextDuplicates } from '../domain/imageDuplicates'
import type { CompressionPreset, InvoiceFileRecord } from '../types'
import { addFile, deleteFile, deleteFilesByInvoice, listFilesByInvoice } from './fileStorageService'
import { syncInvoiceFileIds } from './invoiceService'
import { loadActiveMeal } from './mealPeopleService'
import { PeopleError } from './peopleErrors'
import { t } from '../i18n'

/** Định dạng ảnh được nhận (BR-4.6, R-12). */
export const INVOICE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
/** Dung lượng tối đa của ảnh gốc trước khi nén (ảnh camera điện thoại đời mới có thể rất nặng). */
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024
/** Số ảnh tối đa cho một hoá đơn (R-12). */
export const MAX_IMAGES_PER_INVOICE = 10

/** Mức nén cố định cho mọi ảnh hoá đơn (BR-4.16): đủ rõ cho OCR và tiết kiệm bộ nhớ. */
export const IMAGE_COMPRESSION: CompressionPreset = 'BALANCED'

export interface AddInvoiceImageInput {
  mealId: string
  sessionId: string
  /** Hoá đơn đã lưu, hoặc id tạo trước của hoá đơn đang soạn. */
  invoiceId: string
  file: File
}

/**
 * Thêm một ảnh vào hoá đơn: kiểm định dạng và dung lượng, nén theo mức đã chọn, rồi lưu (BR-4.6, BR-4.16).
 * Hoá đơn đã lưu thì đồng bộ `fileIds` ngay; hoá đơn đang soạn thì đồng bộ khi bấm Lưu.
 */
export async function addInvoiceImage(input: AddInvoiceImageInput): Promise<InvoiceFileRecord> {
  const { mealId, sessionId, invoiceId } = input
  let { file } = input

  // Bữa đã lưu trữ chỉ đọc (BR-4.12): không thêm ảnh.
  await loadActiveMeal(mealId)

  // Một số điện thoại Android trả về file chụp không có MIME: suy ra từ đuôi file.
  if (!file.type) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const inferred = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ''
    if (inferred) file = new File([file], file.name, { type: inferred, lastModified: file.lastModified })
  }
  if (!(INVOICE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new PeopleError('FILE_TYPE_NOT_ALLOWED', t('Chỉ nhận ảnh JPEG, PNG, WebP hoặc PDF (tệp này là "{v}"). Nếu máy chụp HEIC, hãy đổi sang JPEG trong cài đặt camera.', { v: file.type || t('không rõ') }), { type: file.type })
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new PeopleError('FILE_TOO_LARGE', t('Ảnh tối đa 40 MB.'), { size: file.size })
  }
  const existing = await listFilesByInvoice(invoiceId)
  if (existing.length >= MAX_IMAGES_PER_INVOICE) {
    throw new PeopleError('TOO_MANY_FILES', t('Mỗi hoá đơn tối đa {MAX_IMAGES_PER_INVOICE} ảnh.', { MAX_IMAGES_PER_INVOICE }))
  }

  // Ảnh được xử lý như máy quét: cắt theo 4 góc hoá đơn, trắng đen nền trắng, chữ dày (giúp OCR). Không xử lý được
  // (ảnh quá tối, lỗi Canvas...) thì rơi về nén ảnh như cũ; nén lỗi thì vẫn lưu ảnh gốc: không bao giờ làm mất ảnh vừa chụp.
  let stored = file
  let compression: CompressionPreset | undefined
  try {
    const scanned = await scanReceiptImage(file)
    if (scanned) {
      stored = scanned.file
      compression = 'ORIGINAL'
    }
  } catch {
    // Chuyển sang nén bên dưới.
  }
  if (stored === file) {
    try {
      const compressed = await compressImage(file, IMAGE_COMPRESSION)
      stored = compressed.file
      compression = IMAGE_COMPRESSION
    } catch {
      stored = file
    }
  }

  const record = await addFile({
    mealId,
    sessionId,
    invoiceId,
    file: stored,
    originalSizeBytes: file.size,
    compression,
  })
  await syncInvoiceFileIds(invoiceId)
  return record
}

export interface AddInvoicePdfResult {
  records: InvoiceFileRecord[]
  /** Số trang của PDF. */
  totalPages: number
  /** PDF nhiều trang hơn số ảnh còn nhận được: các trang cuối bị bỏ. */
  truncated: boolean
}

/**
 * Thêm một PDF làm hoá đơn: mỗi trang thành một ảnh, kèm văn bản lấy thẳng từ lớp chữ của PDF khi có (không cần OCR).
 * Chỉ nhận số trang đầu còn chỗ trong giới hạn ảnh của hoá đơn.
 */
export async function addInvoicePdf(input: AddInvoiceImageInput): Promise<AddInvoicePdfResult> {
  const { mealId, sessionId, invoiceId, file } = input
  await loadActiveMeal(mealId)
  if (!isPdfFile(file)) {
    throw new PeopleError('FILE_TYPE_NOT_ALLOWED', t('Tệp này không phải PDF.'), { type: file.type })
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new PeopleError('FILE_TOO_LARGE', t('Ảnh tối đa 40 MB.'), { size: file.size })
  }
  const existing = await listFilesByInvoice(invoiceId)
  const room = MAX_IMAGES_PER_INVOICE - existing.length
  if (room <= 0) {
    throw new PeopleError('TOO_MANY_FILES', t('Mỗi hoá đơn tối đa {MAX_IMAGES_PER_INVOICE} ảnh.', { MAX_IMAGES_PER_INVOICE }))
  }

  const { pages, totalPages } = await importPdf(file, room)
  const records: InvoiceFileRecord[] = []
  for (const page of pages) {
    records.push(
      await addFile({
        mealId,
        sessionId,
        invoiceId,
        file: page.file,
        ocrRawText: page.text,
        originalSizeBytes: records.length === 0 ? file.size : undefined,
        compression: 'ORIGINAL',
      }),
    )
  }
  await syncInvoiceFileIds(invoiceId)
  return { records, totalPages, truncated: totalPages > pages.length }
}

/** Xoá một ảnh (BR-4.6). Hoá đơn đã lưu được đồng bộ lại danh sách ảnh. */
export async function removeInvoiceImage(fileId: string): Promise<void> {
  const record = await db.invoice_files.get(fileId)
  if (record) await loadActiveMeal(record.mealId)
  await deleteFile(fileId)
  if (record) await syncInvoiceFileIds(record.invoiceId)
}

/**
 * Bỏ ảnh của hoá đơn đang soạn mà chưa lưu (huỷ form). Hoá đơn đã lưu thì không đụng tới (R-15, BR-4.14).
 */
export async function discardDraftFiles(invoiceId: string): Promise<void> {
  if (await db.invoices.get(invoiceId)) return
  await deleteFilesByInvoice(invoiceId)
}

/**
 * Dọn ảnh mồ côi: ảnh của một bữa mà hoá đơn của nó không còn (ví dụ tắt tab giữa lúc soạn).
 * Trả về số ảnh đã xoá.
 */
export async function sweepOrphanFiles(mealId: string): Promise<number> {
  const [files, invoices] = await Promise.all([
    db.invoice_files.where('mealId').equals(mealId).toArray(),
    db.invoices.where('mealId').equals(mealId).toArray(),
  ])
  const live = new Set(invoices.map((inv) => inv.id))
  const orphans = files.filter((f) => !live.has(f.invoiceId))
  for (const orphan of orphans) {
    await deleteFile(orphan.id)
  }
  return orphans.length
}

/** Lưu văn bản OCR thô của một ảnh (SA B.4: ocrRawText). */
export async function saveOcrText(fileId: string, text: string): Promise<void> {
  await db.invoice_files.update(fileId, { ocrRawText: text })
}

export interface DuplicateImage {
  /** Ảnh đã có trước đó mà ảnh này trùng. */
  duplicateOf: InvoiceFileRecord
  /** Cùng hoá đơn với ảnh đang xét (hay ở hoá đơn khác trong bữa). */
  sameInvoice: boolean
  similarity: number
}

/**
 * Ảnh trùng với `fileId` trong cùng bữa, dựa trên văn bản OCR đã lưu (BR-4.18).
 * Ảnh chưa có văn bản OCR thì chưa so được và trả về rỗng.
 */
export async function findDuplicateImages(fileId: string): Promise<DuplicateImage[]> {
  const target = await db.invoice_files.get(fileId)
  if (!target?.ocrRawText) return []
  const siblings = await db.invoice_files.where('mealId').equals(target.mealId).toArray()
  return findTextDuplicates(target, siblings).map((hit) => ({
    duplicateOf: hit.other,
    sameInvoice: hit.other.invoiceId === target.invoiceId,
    similarity: hit.similarity,
  }))
}
