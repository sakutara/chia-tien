import { prepareForOcr } from '../lib/imagePreprocess'
import { acceptReread, buildText, collectLines, cropRect, selectRereadTargets, type OcrBlockLike, type OcrWord } from '../domain/ocrDigits'
import { PeopleError } from './peopleErrors'
import { t } from '../i18n'

/*
 * OCR offline bằng Tesseract.js (BR-4.7, BR-4.13). Worker và dữ liệu ngôn ngữ nằm trong public/ocr,
 * nên quét không cần mạng. Worker được tạo khi quét lần đầu, dùng lại, và tự dừng sau một phút rảnh.
 */

const BASE = `${import.meta.env.BASE_URL}ocr/`
const IDLE_MS = 60_000

export type OcrProgressHandler = (percent: number, stage: string) => void

/** Tesseract.js (tải lười) — kiểu tối thiểu dùng trong app. */
interface OcrWorker {
  setParameters(params: Record<string, string>): Promise<unknown>
  recognize(image: Blob, options?: Record<string, unknown>, output?: Record<string, boolean>): Promise<{ data: { text: string; blocks?: OcrBlockLike[] | null } }>
  terminate(): Promise<unknown>
}

let workerPromise: Promise<OcrWorker> | null = null
/** Worker `eng` riêng cho lượt 2 (đọc lại số tiền), tạo lười. */
let digitWorkerPromise: Promise<OcrWorker> | null = null
let idleTimer: ReturnType<typeof setTimeout> | undefined
let currentProgress: OcrProgressHandler | undefined

async function createOcrWorker(): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js')
  const worker = (await createWorker(['vie', 'eng'], undefined, {
    workerPath: `${BASE}worker.min.js`,
    corePath: BASE,
    langPath: BASE,
    gzip: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') currentProgress?.(Math.round(m.progress * 100), t('Đang đọc chữ…'))
    },
  })) as unknown as OcrWorker
  // Bill là một cột chữ: PSM 4 (một cột, kích cỡ chữ đổi dòng) giữ đúng thứ tự dòng và cột giá; PSM 3 hay làm
  // vỡ bảng món. Giữ khoảng trắng giữa các từ để cột đơn giá / SL / thành tiền không dính nhau.
  await worker.setParameters({
    tessedit_pageseg_mode: '4',
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  })
  return worker
}

function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = createOcrWorker().catch((err: unknown) => {
      workerPromise = null
      throw err
    })
  }
  return workerPromise
}

/** Worker chỉ đọc số: một dòng, whitelist chữ số và dấu nhóm nghìn (không nhầm `đ`, `l`, `O`). */
async function createDigitWorker(): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js')
  const worker = (await createWorker(['eng'], undefined, {
    workerPath: `${BASE}worker.min.js`,
    corePath: BASE,
    langPath: BASE,
    gzip: false,
  })) as unknown as OcrWorker
  await worker.setParameters({
    tessedit_pageseg_mode: '7',
    tessedit_char_whitelist: '0123456789.,',
    user_defined_dpi: '300',
  })
  return worker
}

function getDigitWorker(): Promise<OcrWorker> {
  if (!digitWorkerPromise) {
    digitWorkerPromise = createDigitWorker().catch((err: unknown) => {
      digitWorkerPromise = null
      throw err
    })
  }
  return digitWorkerPromise
}

/** Cắt một vùng từ ảnh đã chuẩn bị (Blob PNG) thành Blob PNG mới để đọc lại. */
async function cropBlob(bitmap: ImageBitmap, word: OcrWord): Promise<Blob> {
  const rect = cropRect(word, bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = rect.w + 40
  canvas.height = rect.h + 40
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(t('Canvas không khả dụng.'))
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 20, 20, rect.w, rect.h)
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t('Không tạo được ảnh OCR.')))), 'image/png'))
}

/**
 * Lượt 2 (02 §3 bước 2): đọc lại từng từ số tiền của lượt 1 bằng bộ đọc chỉ-chữ-số, rồi ghép lại văn bản.
 * Không có toạ độ từ hoặc không có từ số nào thì giữ nguyên văn bản lượt 1.
 */
async function rereadNumbers(prepared: Blob, data: { text: string; blocks?: OcrBlockLike[] | null }, onProgress?: OcrProgressHandler): Promise<string> {
  const lines = collectLines(data.blocks)
  const targets = selectRereadTargets(lines)
  if (targets.length === 0) return data.text

  const worker = await getDigitWorker()
  const bitmap = await createImageBitmap(prepared)
  const replaced = new Map<string, string>()
  try {
    for (let i = 0; i < targets.length; i++) {
      const { line, word } = targets[i]
      onProgress?.(Math.round((i / targets.length) * 100), t('Đang đọc lại số…'))
      const original = lines[line][word]
      const { data: out } = await worker.recognize(await cropBlob(bitmap, original))
      const accepted = acceptReread(original.text, out.text)
      if (accepted !== undefined) replaced.set(`${line}:${word}`, accepted)
    }
  } finally {
    bitmap.close()
  }
  return replaced.size === 0 ? data.text : buildText(lines, replaced)
}

/** Dừng worker (khi huỷ hoặc khi rảnh lâu). Lần quét sau sẽ tạo lại. */
export async function terminateOcrWorker(): Promise<void> {
  clearTimeout(idleTimer)
  const pending = [workerPromise, digitWorkerPromise]
  workerPromise = null
  digitWorkerPromise = null
  for (const promise of pending) {
    if (!promise) continue
    try {
      const worker = await promise
      await worker.terminate()
    } catch {
      // Worker chưa khởi tạo xong hoặc đã lỗi: không còn gì để dừng.
    }
  }
}

function scheduleIdleStop(): void {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => void terminateOcrWorker(), IDLE_MS)
}

/**
 * Quét văn bản từ từng ảnh theo thứ tự. Trả về văn bản của từng ảnh.
 * Huỷ bằng `signal`: worker bị dừng và ném `OCR_CANCELLED`.
 */
export async function runOcr(
  images: Blob[],
  options: { onProgress?: OcrProgressHandler; signal?: AbortSignal } = {},
): Promise<string[]> {
  const { onProgress, signal } = options
  const aborted = () => signal?.aborted === true
  const cancelled = () => new PeopleError('OCR_CANCELLED', t('Đã huỷ quét ảnh.'))

  if (aborted()) throw cancelled()
  const onAbort = () => void terminateOcrWorker()
  signal?.addEventListener('abort', onAbort, { once: true })
  currentProgress = onProgress

  try {
    onProgress?.(0, t('Đang khởi tạo bộ đọc chữ…'))
    const worker = await getWorker()
    const texts: string[] = []
    for (let i = 0; i < images.length; i++) {
      if (aborted()) throw cancelled()
      onProgress?.(Math.round((i / images.length) * 100), t('Đang chuẩn bị ảnh {v}/{length}…', { v: i + 1, length: images.length }))
      const prepared = await prepareForOcr(images[i])
      if (aborted()) throw cancelled()
      const { data } = await worker.recognize(prepared, {}, { text: true, blocks: true })
      if (aborted()) throw cancelled()
      texts.push(await rereadNumbers(prepared, data, onProgress))
    }
    onProgress?.(100, t('Xong'))
    return texts
  } catch (err) {
    if (aborted()) throw cancelled()
    if (err instanceof PeopleError) throw err
    throw new PeopleError('OCR_FAILED', t('Không quét được ảnh. Bạn vẫn có thể nhập tay.'))
  } finally {
    signal?.removeEventListener('abort', onAbort)
    currentProgress = undefined
    if (aborted()) await terminateOcrWorker()
    else scheduleIdleStop()
  }
}
