/*
 * Web Worker chạy Qwen2.5-0.5B-Instruct (Transformers.js). Worker được tạo cho từng lượt đọc và bị terminate ngay sau đó,
 * để trả lại toàn bộ RAM/VRAM cho hệ điều hành (architecture §5.1). Giao thức: `SlmWorkerRequest` / `SlmWorkerResponse`.
 */
import { env, pipeline, type TextGenerationPipeline } from '@huggingface/transformers'
import { LOCAL_SLM_MODEL_ID, type SlmWorkerErrorCode, type SlmWorkerRequest, type SlmWorkerResponse } from '../services/aiContracts'

/** Giới hạn sinh token: đủ cho hoá đơn 25–30 món, giữ KV-cache nhỏ trên iOS. */
const MAX_NEW_TOKENS = 768

/** Phần của scope worker mà file này dùng. */
const scope = self as unknown as { postMessage(message: SlmWorkerResponse): void; onmessage: ((e: MessageEvent<SlmWorkerRequest>) => void) | null }

let generator: TextGenerationPipeline | null = null

function classify(err: unknown): { code: SlmWorkerErrorCode; message: string } {
  const message = err instanceof Error ? err.message : String(err)
  if (/out of memory|allocation|memory/i.test(message)) return { code: 'AI_OUT_OF_MEMORY', message }
  if (/fetch|network|failed to load|download/i.test(message)) return { code: 'AI_DOWNLOAD_FAILED', message }
  return { code: 'AI_FAILED', message }
}

/** Tải (lần đầu) và nạp mô hình. WebGPU khi có, không thì WASM với q4. */
async function loadModel(requestId: string): Promise<void> {
  if (generator) return
  env.allowLocalModels = false
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator
  // Ép kiểu: bộ khai báo kiểu của Transformers.js cho `pipeline` quá phức tạp với TypeScript.
  const createPipeline = pipeline as unknown as (task: string, model: string, options: Record<string, unknown>) => Promise<TextGenerationPipeline>
  generator = await createPipeline('text-generation', LOCAL_SLM_MODEL_ID, {
    device: hasWebGpu ? 'webgpu' : 'wasm',
    dtype: hasWebGpu ? 'q4f16' : 'q4',
    progress_callback: (p: { status: string; progress?: number; loaded?: number; total?: number }) => {
      if (p.status === 'progress') {
        scope.postMessage({
          type: 'PROGRESS',
          requestId,
          status: 'downloading',
          percent: Math.round(p.progress ?? 0),
          loadedBytes: p.loaded,
          totalBytes: p.total,
        })
      }
    },
  })
}

async function generate(requestId: string, systemPrompt: string, userPrompt: string): Promise<string> {
  if (!generator) await loadModel(requestId)
  if (!generator) throw new Error('model not loaded')
  const output = await generator(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { max_new_tokens: MAX_NEW_TOKENS, do_sample: false },
  )
  const generated = (output[0] as { generated_text: string | Array<{ role: string; content: string }> }).generated_text
  // Với đầu vào dạng hội thoại, phần sinh ra là các message mới; lấy message cuối (của assistant).
  return typeof generated === 'string' ? generated : (generated.at(-1)?.content ?? '')
}

scope.onmessage = async (event: MessageEvent<SlmWorkerRequest>) => {
  const request = event.data
  try {
    if (request.type === 'LOAD_MODEL') {
      await loadModel(request.requestId)
      scope.postMessage({ type: 'LOADED', requestId: request.requestId })
      return
    }
    const rawJson = await generate(request.requestId, request.systemPrompt, request.userPrompt)
    scope.postMessage({ type: 'RESULT', requestId: request.requestId, rawJson })
  } catch (err) {
    const { code, message } = classify(err)
    scope.postMessage({ type: 'ERROR', requestId: request.requestId, code, message })
  }
}
