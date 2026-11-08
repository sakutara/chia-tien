import { t } from '../i18n'
import { generateId } from '../lib/id'
import { shouldConfirmModelDownload } from '../lib/networkGuard'
import {
  aiToParsedReceipt,
  buildLocalSlmPrompt,
  checkAiReceipt,
  LOCAL_SLM_SYSTEM_PROMPT,
  type AiCheck,
  type AiHints,
  type AiReceipt,
} from '../domain/aiReceipt'
import type { ParsedReceipt } from '../domain/receiptParser'
import {
  LOCAL_SLM_MODEL_ID,
  type LocalAiStatus,
  type SlmWorkerRequest,
  type SlmWorkerResponse,
} from './aiContracts'
import { registerMemoryCleaner, withAiMemoryScope } from './memoryLifecycle'
import { PeopleError } from './peopleErrors'

/*
 * Bộ đọc AI trên máy (Local SLM): bật/tắt, kiểm tra cache mô hình, và đọc hoá đơn qua slmWorker.
 * Trạng thái bật/tắt: nếu người dùng chưa gạt công tắc lần nào thì mặc định BẬT khi mô hình đã tải sẵn.
 */

const PREF_KEY = 'fee-calculator.useLocalAi' // 'true' | 'false' | chưa đặt
const CACHED_FLAG_KEY = 'fee-calculator.localAiCached' // cờ đồng bộ để UI render ngay
const CACHE_NAME = 'transformers-cache'
const LEGACY_GEMINI_KEYS = ['fee-calculator.geminiApiKey', 'fee-calculator.geminiModel']
const MAX_ROUNDS = 2

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // chế độ riêng tư hoặc bị chặn lưu trữ
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Không lưu được thì bỏ qua: trạng thái suy ra từ Cache Storage vẫn đúng.
  }
}

// Xoá khoá Gemini cũ (từ bản dùng cloud) để không giữ khoá API trong trình duyệt.
for (const key of LEGACY_GEMINI_KEYS) writeStorage(key, null)

const isModelFile = (url: string) => url.includes(LOCAL_SLM_MODEL_ID) && /\.onnx(_data)?$/.test(url)

async function openModelCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try {
    return await caches.open(CACHE_NAME)
  } catch {
    return null
  }
}

/** Kiểm tra trong Cache Storage xem file trọng số của mô hình đã được tải về chưa, và cập nhật cờ đồng bộ. */
export async function verifyModelCache(): Promise<{ cached: boolean; bytes: number }> {
  const cache = await openModelCache()
  if (!cache) {
    writeStorage(CACHED_FLAG_KEY, 'false')
    return { cached: false, bytes: 0 }
  }
  const files = (await cache.keys()).filter((request) => isModelFile(request.url))
  let bytes = 0
  for (const file of files) {
    const response = await cache.match(file)
    bytes += Number(response?.headers.get('content-length') ?? 0)
  }
  const cached = files.length > 0
  writeStorage(CACHED_FLAG_KEY, cached ? 'true' : 'false')
  return { cached, bytes }
}

function readCachedFlag(): boolean {
  return readStorage(CACHED_FLAG_KEY) === 'true'
}

/** Trạng thái bật/tắt hiệu lực: lựa chọn đã lưu, nếu chưa có thì bật khi mô hình đã có sẵn. */
export function isLocalAiEnabled(): boolean {
  const pref = readStorage(PREF_KEY)
  if (pref === 'true') return true
  if (pref === 'false') return false
  return readCachedFlag()
}

export function setLocalAiEnabled(enabled: boolean): void {
  writeStorage(PREF_KEY, enabled ? 'true' : 'false')
}

/** Có cần hỏi người dùng trước khi tải mô hình (mạng di động hoặc không rõ) hay không. */
export function needsCellularConfirmation(): boolean {
  return shouldConfirmModelDownload(readCachedFlag())
}

export async function getLocalAiStatus(): Promise<LocalAiStatus> {
  const { cached, bytes } = await verifyModelCache()
  return { cached, cachedBytes: bytes, enabled: isLocalAiEnabled() }
}

/** Xoá file mô hình khỏi Cache Storage để lấy lại dung lượng; trạng thái trở về TẮT. */
export async function clearLocalAiCache(): Promise<void> {
  terminateSlmWorker()
  const cache = await openModelCache()
  if (cache) {
    for (const request of await cache.keys()) {
      if (isModelFile(request.url)) await cache.delete(request)
    }
  }
  writeStorage(CACHED_FLAG_KEY, 'false')
  writeStorage(PREF_KEY, 'false')
}

let slmWorker: Worker | null = null

/** Huỷ slmWorker đang chạy (nếu có), trả lại RAM/VRAM. */
export function terminateSlmWorker(): void {
  slmWorker?.terminate()
  slmWorker = null
}

registerMemoryCleaner(terminateSlmWorker)

function cancelled(): PeopleError {
  return new PeopleError('OCR_CANCELLED', t('Đã huỷ quét ảnh.'))
}

/**
 * Gửi một yêu cầu tới worker và chờ đúng phản hồi của nó. Huỷ bằng `signal` sẽ terminate worker.
 * `onProgress` nhận tiến trình tải mô hình.
 */
function askWorker(
  worker: Worker,
  request: SlmWorkerRequest,
  onProgress: ((percent: number) => void) | undefined,
  signal: AbortSignal | undefined,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const finish = (settle: () => void) => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
      settle()
    }
    const onMessage = (event: MessageEvent<SlmWorkerResponse>) => {
      const msg = event.data
      if (msg.requestId !== request.requestId) return
      if (msg.type === 'PROGRESS') onProgress?.(msg.percent)
      else if (msg.type === 'LOADED') finish(() => resolve(''))
      else if (msg.type === 'RESULT') finish(() => resolve(msg.rawJson))
      else if (msg.type === 'ERROR') finish(() => reject(new PeopleError(msg.code, msg.message)))
    }
    const onError = () => finish(() => reject(new PeopleError('AI_FAILED', t('Không đọc được hoá đơn bằng AI.'))))
    const onAbort = () => {
      terminateSlmWorker()
      finish(() => reject(cancelled()))
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
    worker.postMessage(request)
  })
}

/** Đọc JSON từ phản hồi của mô hình; bỏ hàng rào ```json nếu có. */
function parseAiJson(text: string): AiReceipt {
  try {
    const value: unknown = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''))
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as AiReceipt
  } catch {
    // rơi xuống lỗi chung
  }
  throw new PeopleError('AI_FAILED', t('Dữ liệu AI trả về không đọc được. Hãy thử lại.'))
}

export interface LocalAiOptions {
  signal?: AbortSignal
  onStage?: (stage: string) => void
  /** Người dùng đã đồng ý tải mô hình (dùng khi mạng không phải Wi-Fi và mô hình chưa có). */
  confirmedDownload?: boolean
}

export interface LocalAiReadResult {
  receipt: ParsedReceipt
  check: AiCheck['check']
  /** Số lần đã hỏi mô hình (2 nghĩa là lượt đầu chưa khớp nên đã đọc lại). */
  rounds: number
}

/**
 * Nhờ mô hình trên máy sửa và bóc tách văn bản OCR. Tổng không khớp thì gửi lại chỗ lệch để đọc lại một lần,
 * rồi giữ kết quả tốt hơn. Worker bị terminate ngay khi xong, kể cả khi lỗi.
 */
export async function readReceiptWithLocalAi(hints: AiHints, options: LocalAiOptions = {}): Promise<LocalAiReadResult> {
  const { signal, onStage, confirmedDownload = false } = options
  const { cached } = await verifyModelCache()
  if (!cached && !confirmedDownload && shouldConfirmModelDownload(false)) {
    throw new PeopleError('AI_MODEL_NOT_CACHED', t('Cần tải bộ đọc AI (~320 MB) lần đầu. Hãy xác nhận để tải.'))
  }

  return withAiMemoryScope(async () => {
    if (signal?.aborted) throw cancelled()
    const worker = new Worker(new URL('../workers/slmWorker.ts', import.meta.url), { type: 'module' })
    slmWorker = worker
    try {
      onStage?.(t('Đang chuẩn bị bộ đọc AI…'))
      await askWorker(worker, { type: 'LOAD_MODEL', requestId: generateId() }, (percent) => onStage?.(t('Đang tải bộ đọc AI… {v}%', { v: percent })), signal)

      let userPrompt = buildLocalSlmPrompt(hints)
      let best: { receipt: ParsedReceipt; result: AiCheck; rounds: number } | null = null
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        onStage?.(round === 1 ? t('Đang nhờ AI trên máy đọc hoá đơn…') : t('Số liệu chưa khớp, đang nhờ AI đọc lại…'))
        const rawJson = await askWorker(
          worker,
          { type: 'GENERATE_RECEIPT', requestId: generateId(), systemPrompt: LOCAL_SLM_SYSTEM_PROMPT, userPrompt },
          undefined,
          signal,
        )
        const ai = parseAiJson(rawJson)
        const receipt = aiToParsedReceipt(ai)
        const result = checkAiReceipt(ai, receipt)
        if (!best || result.problems.length <= best.result.problems.length) best = { receipt, result, rounds: round }
        if (result.ok) break
        userPrompt = buildLocalSlmPrompt({ ...hints, notes: [...(hints.notes ?? []), ...result.problems] })
      }
      const final = best as NonNullable<typeof best>
      return { receipt: final.receipt, check: final.result.check, rounds: final.rounds }
    } finally {
      terminateSlmWorker()
    }
  })
}
