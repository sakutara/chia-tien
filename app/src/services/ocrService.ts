import { prepareForOcr } from '../lib/imagePreprocess'
import { PeopleError } from './peopleErrors'

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
  recognize(image: Blob): Promise<{ data: { text: string } }>
  terminate(): Promise<unknown>
}

let workerPromise: Promise<OcrWorker> | null = null
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
      if (m.status === 'recognizing text') currentProgress?.(Math.round(m.progress * 100), 'Đang đọc chữ…')
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

/** Dừng worker (khi huỷ hoặc khi rảnh lâu). Lần quét sau sẽ tạo lại. */
export async function terminateOcrWorker(): Promise<void> {
  clearTimeout(idleTimer)
  const pending = workerPromise
  workerPromise = null
  if (!pending) return
  try {
    const worker = await pending
    await worker.terminate()
  } catch {
    // Worker chưa khởi tạo xong hoặc đã lỗi: không còn gì để dừng.
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
  const cancelled = () => new PeopleError('OCR_CANCELLED', 'Đã huỷ quét ảnh.')

  if (aborted()) throw cancelled()
  const onAbort = () => void terminateOcrWorker()
  signal?.addEventListener('abort', onAbort, { once: true })
  currentProgress = onProgress

  try {
    onProgress?.(0, 'Đang khởi tạo bộ đọc chữ…')
    const worker = await getWorker()
    const texts: string[] = []
    for (let i = 0; i < images.length; i++) {
      if (aborted()) throw cancelled()
      onProgress?.(Math.round((i / images.length) * 100), `Đang chuẩn bị ảnh ${i + 1}/${images.length}…`)
      const prepared = await prepareForOcr(images[i])
      if (aborted()) throw cancelled()
      const { data } = await worker.recognize(prepared)
      texts.push(data.text)
    }
    onProgress?.(100, 'Xong')
    return texts
  } catch (err) {
    if (aborted()) throw cancelled()
    if (err instanceof PeopleError) throw err
    throw new PeopleError('OCR_FAILED', 'Không quét được ảnh. Bạn vẫn có thể nhập tay.')
  } finally {
    signal?.removeEventListener('abort', onAbort)
    currentProgress = undefined
    if (aborted()) await terminateOcrWorker()
    else scheduleIdleStop()
  }
}
