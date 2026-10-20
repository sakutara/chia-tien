import { t } from '../i18n'
import { PeopleError } from '../services/peopleErrors'
import { pageTextOrUndefined, type PdfTextItem } from './pdfText'

/*
 * Nhập PDF làm hoá đơn: mỗi trang thành một ảnh JPEG (để xem, tải về và OCR như ảnh thường) kèm văn bản lấy thẳng từ
 * lớp chữ của PDF khi có (hoá đơn điện tử: chính xác hơn OCR và không tốn thời gian quét). Chỉ chạy trên trình duyệt (Canvas).
 * pdf.js nạp lười (chỉ khi người dùng chọn PDF) để không làm nặng bundle chính; dùng bản `legacy` cho trình duyệt cũ hơn.
 */

/** Cạnh dài của ảnh trang sau khi dựng: đủ nét để OCR khi PDF là ảnh quét, như cỡ ảnh OCR của máy quét. */
export const PDF_TARGET_LONG_EDGE = 2800
/** Hệ số dựng tối đa (trang PDF nhỏ như cuống hoá đơn không bị phóng quá mức). */
export const PDF_MAX_SCALE = 4
export const PDF_JPEG_QUALITY = 0.92

export interface PdfPageImport {
  /** Ảnh JPEG của trang. */
  file: File
  /** Văn bản từ lớp chữ của PDF; `undefined` khi trang không có chữ (cần OCR ảnh). */
  text?: string
}

export interface PdfImportResult {
  pages: PdfPageImport[]
  totalPages: number
}

/** Có phải tệp PDF không (theo MIME, hoặc đuôi .pdf khi trình duyệt không cho MIME). */
export function isPdfFile(file: Pick<File, 'type' | 'name'>): boolean {
  return file.type === 'application/pdf' || (file.type === '' && /\.pdf$/i.test(file.name))
}

interface TextContentItem {
  str?: string
  transform?: number[]
  width?: number
  height?: number
}

function toTextItems(items: ReadonlyArray<unknown>): PdfTextItem[] {
  const out: PdfTextItem[] = []
  for (const raw of items as TextContentItem[]) {
    if (typeof raw.str !== 'string' || !raw.transform) continue
    out.push({ str: raw.str, x: raw.transform[4], y: raw.transform[5], width: raw.width ?? 0, height: raw.height ?? Math.abs(raw.transform[3]) })
  }
  return out
}

function invalidPdf(): PeopleError {
  return new PeopleError('PDF_INVALID', t('Không đọc được tệp PDF này. Hãy thử xuất lại PDF hoặc chụp ảnh hoá đơn.'))
}

/** Dựng tối đa `maxPages` trang đầu của PDF thành ảnh, kèm văn bản của từng trang nếu có. */
export async function importPdf(file: File, maxPages: number): Promise<PdfImportResult> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  let pdf: Awaited<typeof task.promise>
  try {
    pdf = await task.promise
  } catch (err) {
    if ((err as { name?: string }).name === 'PasswordException') {
      throw new PeopleError('PDF_ENCRYPTED', t('PDF này có mật khẩu. Hãy mở khoá rồi tải lại.'))
    }
    throw invalidPdf()
  }

  try {
    const base = file.name.replace(/\.[^.]+$/, '') || 'hoa-don'
    const pages: PdfPageImport[] = []
    const count = Math.min(pdf.numPages, Math.max(0, maxPages))
    for (let n = 1; n <= count; n++) {
      const page = await pdf.getPage(n)
      try {
        const natural = page.getViewport({ scale: 1 })
        const scale = Math.min(PDF_MAX_SCALE, PDF_TARGET_LONG_EDGE / Math.max(natural.width, natural.height))
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(viewport.width))
        canvas.height = Math.max(1, Math.round(viewport.height))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('Canvas không khả dụng.'))
        // PDF nền trong suốt: tô trắng để JPEG không thành đen.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport }).promise

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PDF_JPEG_QUALITY))
        if (!blob) throw new Error(t('Không tạo được ảnh OCR.'))
        const text = pageTextOrUndefined(toTextItems((await page.getTextContent()).items))
        pages.push({ file: new File([blob], `${base}-p${n}.jpg`, { type: 'image/jpeg' }), text })
      } finally {
        page.cleanup()
      }
    }
    return { pages, totalPages: pdf.numPages }
  } finally {
    void pdf.destroy()
  }
}
