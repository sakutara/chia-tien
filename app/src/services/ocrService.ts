import { prepareForOcr } from '../lib/imagePreprocess'
import { generateId } from '../lib/id'
import { layoutOcrText, type OcrWord } from '../domain/ocrLayout'
import { t } from '../i18n'
import type { VietOcrWorkerRequest, VietOcrWorkerResponse } from './workerContracts'
import { registerMemoryCleaner } from './memoryLifecycle'
import { PeopleError } from './peopleErrors'

/*
 * OCR trên máy bằng VietOCR ONNX (BR-4.7, BR-4.13): detector DB + recognizer vgg_seq2seq chạy trong Web Worker
 * (`workers/vietOcrWorker.ts`). Worker giữ model giữa các lần quét và tự dừng sau 15 giây rảnh;
 * `memoryLifecycle` dừng ngay khi đóng form hoặc ẩn app. Không có dự phòng: lỗi thì báo cho người dùng nhập tay.
 */

/**
 * Gốc tuyệt đối của app. Bản deploy build với `--base=./`; đường dẫn tương đối trong worker lại tính theo vị trí file worker
 * (`assets/`), nên phải đổi sang URL tuyệt đối theo trang trước khi gửi cho worker.
 */
const BASE = new URL(import.meta.env.BASE_URL, document.baseURI).href
const IDLE_MS = 15_000

export type OcrProgressHandler = (percent: number, stage: string) => void

/** Một worker VietOCR đang sống. `ready` chờ khởi tạo xong; `abort` huỷ mọi yêu cầu đang chờ khi worker bị dừng. */
interface Session {
  worker: Worker
  abort: AbortController
  ready: Promise<void>
}

let session: Session | null = null
let idleTimer: ReturnType<typeof setTimeout> | undefined

function cancelled(): PeopleError {
  return new PeopleError('OCR_CANCELLED', t('Đã huỷ quét ảnh.'))
}

/**
 * Gửi một yêu cầu và chờ phản hồi cùng `requestId`. `settle` trả về giá trị khi phản hồi là kết quả cuối,
 * hoặc `undefined` để tiếp tục chờ. PROGRESS gọi `onProgress`. Huỷ bằng `signal` thì ném OCR_CANCELLED.
 */
function ask<T>(
  worker: Worker,
  request: VietOcrWorkerRequest,
  settle: (msg: VietOcrWorkerResponse) => { value: T } | undefined,
  options: { signal: AbortSignal; onProgress?: (percent: number) => void },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const finish = (fn: () => void) => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      options.signal.removeEventListener('abort', onAbort)
      fn()
    }
    const onMessage = (event: MessageEvent<VietOcrWorkerResponse>) => {
      const msg = event.data
      if (msg.requestId !== request.requestId) return
      if (msg.type === 'PROGRESS') {
        options.onProgress?.(msg.percent)
        return
      }
      if (msg.type === 'ERROR') {
        finish(() => reject(new PeopleError('OCR_FAILED', t('Không quét được ảnh. Bạn vẫn có thể nhập tay.'))))
        return
      }
      const done = settle(msg)
      if (done) finish(() => resolve(done.value))
    }
    const onError = () => finish(() => reject(new PeopleError('OCR_FAILED', t('Không quét được ảnh. Bạn vẫn có thể nhập tay.'))))
    const onAbort = () => finish(() => reject(cancelled()))

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    options.signal.addEventListener('abort', onAbort, { once: true })
    if (options.signal.aborted) onAbort()
    else worker.postMessage(request)
  })
}

/** Tạo worker và nạp model. Worker được ghi nhận ngay để `terminateOcrWorker` luôn dừng được nó. */
function createSession(): Session {
  const worker = new Worker(new URL('../workers/vietOcrWorker.ts', import.meta.url), { type: 'module' })
  const abort = new AbortController()
  const ready = ask(
    worker,
    { type: 'INIT', requestId: generateId(), baseUrl: BASE },
    (msg) => (msg.type === 'READY' ? { value: undefined } : undefined),
    { signal: abort.signal },
  )
  // Lỗi khởi tạo được báo qua `ready`; tránh unhandled rejection khi chưa có ai await.
  ready.catch(() => undefined)
  return { worker, abort, ready }
}

function getSession(): Session {
  if (!session) session = createSession()
  return session
}

/** Dừng worker và huỷ mọi yêu cầu đang chờ. Lần quét sau sẽ tạo lại worker. */
export function terminateOcrWorker(): void {
  clearTimeout(idleTimer)
  idleTimer = undefined
  const current = session
  session = null
  if (!current) return
  current.abort.abort()
  current.worker.terminate()
}

function scheduleIdleStop(): void {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(terminateOcrWorker, IDLE_MS)
}

registerMemoryCleaner(terminateOcrWorker)

/**
 * Quét văn bản từ từng ảnh theo thứ tự, trả về văn bản đã ghép thành dòng và cột của từng ảnh.
 * Huỷ bằng `signal`: worker bị dừng và ném `OCR_CANCELLED`.
 */
export async function runOcr(
  images: Blob[],
  options: { onProgress?: OcrProgressHandler; signal?: AbortSignal } = {},
): Promise<string[]> {
  const { onProgress, signal } = options
  if (signal?.aborted) throw cancelled()
  const onAbort = () => terminateOcrWorker()
  signal?.addEventListener('abort', onAbort, { once: true })

  // Hẹn giờ rảnh của lần quét trước không được tắt worker giữa lần quét này.
  clearTimeout(idleTimer)
  idleTimer = undefined

  try {
    onProgress?.(0, t('Đang khởi tạo bộ đọc chữ…'))
    const current = getSession()
    await current.ready

    const texts: string[] = []
    for (let i = 0; i < images.length; i++) {
      if (signal?.aborted) throw cancelled()
      const share = (percent: number) => Math.round(((i + percent / 100) / images.length) * 100)
      onProgress?.(share(0), t('Đang chuẩn bị ảnh {v}/{length}…', { v: i + 1, length: images.length }))
      const prepared = await prepareForOcr(images[i])
      const lines = await ask<OcrWord[]>(
        current.worker,
        { type: 'RECOGNIZE', requestId: generateId(), image: prepared },
        (msg) => (msg.type === 'RESULT' ? { value: msg.lines } : undefined),
        { signal: current.abort.signal, onProgress: (percent) => onProgress?.(share(percent), t('Đang đọc chữ…')) },
      )
      texts.push(layoutOcrText(lines))
    }
    onProgress?.(100, t('Xong'))
    return texts
  } catch (err) {
    if (signal?.aborted) throw cancelled()
    if (err instanceof PeopleError) throw err
    throw new PeopleError('OCR_FAILED', t('Không quét được ảnh. Bạn vẫn có thể nhập tay.'))
  } finally {
    signal?.removeEventListener('abort', onAbort)
    if (signal?.aborted) terminateOcrWorker()
    else scheduleIdleStop()
  }
}
