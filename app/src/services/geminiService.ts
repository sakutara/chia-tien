import {
  AI_RESPONSE_SCHEMA,
  AI_SYSTEM_PROMPT,
  aiToParsedReceipt,
  buildAiPrompt,
  checkAiReceipt,
  type AiCheck,
  type AiHints,
  type AiReceipt,
} from '../domain/aiReceipt'
import type { ParsedReceipt } from '../domain/receiptParser'
import { PeopleError } from './peopleErrors'
import { t } from '../i18n'

/*
 * Đọc hoá đơn bằng Gemini API (khoá API do người dùng nhập, lưu trong trình duyệt của họ). Ảnh + gợi ý OCR được gửi
 * thẳng từ trình duyệt tới Google; app không có máy chủ trung gian. Kết quả được đối chiếu lại bằng phép tính của app,
 * không khớp thì hỏi lại AI một lần kèm chỗ lệch.
 */

const KEY_STORAGE = 'fee-calculator.geminiApiKey'
const MODEL_STORAGE = 'fee-calculator.geminiModel'
export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Cạnh dài tối đa của ảnh gửi lên: đủ nét để đọc chữ nhỏ, nhẹ để gửi nhanh. */
const AI_IMAGE_LONG_EDGE = 2000
const AI_IMAGE_QUALITY = 0.85
/** Ảnh nhỏ hơn mức này (byte) thì gửi nguyên bản. */
const SEND_AS_IS_BYTES = 1_500_000
const MAX_AI_IMAGES = 6
/** Số lần hỏi AI tối đa (lần đầu + một lần đọc lại khi tổng chưa khớp). */
const MAX_ROUNDS = 2

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function getGeminiKey(): string {
  try {
    return storage()?.getItem(KEY_STORAGE)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function saveGeminiKey(key: string): void {
  try {
    const trimmed = key.trim()
    if (trimmed) storage()?.setItem(KEY_STORAGE, trimmed)
    else storage()?.removeItem(KEY_STORAGE)
  } catch {
    // Trình duyệt chặn lưu trữ: khoá không được nhớ cho lần sau.
  }
}

export function getGeminiModel(): string {
  try {
    return storage()?.getItem(MODEL_STORAGE)?.trim() || DEFAULT_GEMINI_MODEL
  } catch {
    return DEFAULT_GEMINI_MODEL
  }
}

export function saveGeminiModel(model: string): void {
  try {
    const trimmed = model.trim()
    if (trimmed && trimmed !== DEFAULT_GEMINI_MODEL) storage()?.setItem(MODEL_STORAGE, trimmed)
    else storage()?.removeItem(MODEL_STORAGE)
  } catch {
    // như trên
  }
}

export const hasGeminiKey = (): boolean => getGeminiKey() !== ''

interface InlinePart {
  inlineData: { mimeType: string; data: string }
}
type Part = { text: string } | InlinePart
interface Content {
  role: 'user' | 'model'
  parts: Part[]
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < buffer.length; i += chunk) binary += String.fromCharCode(...buffer.subarray(i, i + chunk))
  return btoa(binary)
}

/** Thu nhỏ ảnh lớn trước khi gửi; không thu nhỏ được (không có Canvas, ảnh lỗi) thì gửi nguyên bản. */
async function prepareImage(blob: Blob): Promise<InlinePart> {
  const mimeType = blob.type || 'image/jpeg'
  const original = async (): Promise<InlinePart> => ({ inlineData: { mimeType, data: await blobToBase64(blob) } })
  try {
    if (blob.size <= SEND_AS_IS_BYTES || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return await original()
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, AI_IMAGE_LONG_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return await original()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', AI_IMAGE_QUALITY))
    return jpeg ? { inlineData: { mimeType: 'image/jpeg', data: await blobToBase64(jpeg) } } : await original()
  } catch {
    return await original()
  }
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string }
}

function failure(message: string): PeopleError {
  return new PeopleError('AI_FAILED', message)
}

async function callGemini(key: string, model: string, contents: Content[], signal?: AbortSignal): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: AI_RESPONSE_SCHEMA },
      }),
      signal,
    })
  } catch {
    if (signal?.aborted) throw new PeopleError('OCR_CANCELLED', t('Đã huỷ quét ảnh.'))
    throw failure(t('Không kết nối được tới Gemini. Hãy kiểm tra mạng rồi thử lại.'))
  }

  let body: GeminiResponse = {}
  try {
    body = (await response.json()) as GeminiResponse
  } catch {
    // Phản hồi không phải JSON: xử lý theo mã trạng thái bên dưới.
  }
  if (!response.ok) {
    const message = body.error?.message ?? ''
    if (response.status === 401 || response.status === 403 || /api key/i.test(message)) {
      throw failure(t('Gemini từ chối khoá API. Hãy kiểm tra lại khoá trong phần cài đặt AI.'))
    }
    if (response.status === 429) throw failure(t('Gemini báo hết hạn mức hoặc đang quá tải. Hãy thử lại sau ít phút.'))
    throw failure(t('Gemini báo lỗi: {v}', { v: message || `HTTP ${response.status}` }))
  }
  if (body.promptFeedback?.blockReason) throw failure(t('Gemini từ chối đọc ảnh này ({v}).', { v: body.promptFeedback.blockReason }))
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (text.trim() === '') throw failure(t('Gemini không trả về kết quả. Hãy thử lại.'))
  return text
}

function parseAiJson(text: string): AiReceipt {
  try {
    const value: unknown = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''))
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as AiReceipt
  } catch {
    // rơi xuống lỗi chung
  }
  throw failure(t('Gemini trả về dữ liệu không đọc được. Hãy thử lại.'))
}

export interface AiReadResult {
  receipt: ParsedReceipt
  check: AiCheck['check']
  /** Số lần đã hỏi AI (2 nghĩa là lần đầu chưa khớp nên đã đọc lại). */
  rounds: number
}

/**
 * Nhờ Gemini đọc hoá đơn từ ảnh, kèm gợi ý OCR. Tổng không khớp thì gửi lại chỗ lệch để AI đọc lại một lần, rồi giữ
 * kết quả tốt hơn (khớp, hoặc ít vấn đề hơn).
 */
export async function readReceiptWithGemini(
  images: Blob[],
  hints: AiHints,
  options: { signal?: AbortSignal; onStage?: (stage: string) => void } = {},
): Promise<AiReadResult> {
  const key = getGeminiKey()
  if (!key) throw new PeopleError('AI_NO_KEY', t('Chưa có khoá Gemini API. Hãy nhập khoá trong phần cài đặt AI.'))
  if (images.length === 0) throw failure(t('Chưa có ảnh để gửi cho AI.'))
  const { signal, onStage } = options
  const model = getGeminiModel()

  onStage?.(t('Đang chuẩn bị ảnh gửi AI…'))
  const parts: Part[] = [{ text: buildAiPrompt(hints) }]
  for (const image of images.slice(0, MAX_AI_IMAGES)) parts.push(await prepareImage(image))
  const contents: Content[] = [{ role: 'user', parts }]

  let best: { receipt: ParsedReceipt; result: AiCheck; rounds: number } | null = null
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    onStage?.(round === 1 ? t('Đang nhờ AI đọc hoá đơn…') : t('Số liệu chưa khớp, đang nhờ AI đọc lại…'))
    const text = await callGemini(key, model, contents, signal)
    const ai = parseAiJson(text)
    const receipt = aiToParsedReceipt(ai)
    const result = checkAiReceipt(ai, receipt)
    if (!best || result.problems.length <= best.result.problems.length) best = { receipt, result, rounds: round }
    if (result.ok) break
    contents.push(
      { role: 'model', parts: [{ text }] },
      { role: 'user', parts: [{ text: `Problems found by an automatic check:\n${result.problems.join('\n')}\nReturn the corrected JSON.` }] },
    )
  }
  const final = best as NonNullable<typeof best>
  return { receipt: final.receipt, check: final.result.check, rounds: final.rounds }
}
