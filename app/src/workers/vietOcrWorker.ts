/*
 * Web Worker chạy VietOCR ONNX (repo duchoa1297/vietocr-onnx): detector DB + encoder/decoder vgg_seq2seq.
 * Worker giữ session trong RAM giữa các lần quét và được terminate khi rảnh hoặc khi rời màn (memoryLifecycle).
 * Giao thức: `VietOcrWorkerRequest` / `VietOcrWorkerResponse`.
 */
import * as ort from 'onnxruntime-web'
import {
  detectTextBoxes,
  detectorInputSize,
  recognizeLine,
  recognizerWidth,
  toRecognizerTensor,
  type EncodeResult,
  type VietOcrEngine,
  type VietOcrMeta,
} from '../domain/vietOcr'
import type { OcrWord } from '../domain/ocrLayout'
import type { VietOcrWorkerRequest, VietOcrWorkerResponse } from '../services/aiContracts'

/** Chiều cao cố định đầu vào của encoder (xem vietocr.json). */
const REC_HEIGHT = 32
/** Số chiều đặc trưng của encoder/decoder (xem mô tả model). */
const FEATURE_DIM = 512

/** Phần của scope worker mà file này dùng. */
const scope = self as unknown as { postMessage(message: VietOcrWorkerResponse): void; onmessage: ((e: MessageEvent<VietOcrWorkerRequest>) => void) | null }

let engine: VietOcrEngine | null = null
let meta: VietOcrMeta | null = null

/** Tạo session từ file trong public/ocr/vietocr và đọc vietocr.json. Chạy CPU/WASM để không cần WebGPU hay cross-origin isolation. */
async function init(baseUrl: string): Promise<void> {
  ort.env.wasm.wasmPaths = `${baseUrl}ocr/vietocr/ort/`
  ort.env.wasm.numThreads = 1
  const dir = `${baseUrl}ocr/vietocr/`
  const options = { executionProviders: ['wasm'] }
  const [det, encoder, decoder, metaResponse] = await Promise.all([
    ort.InferenceSession.create(`${dir}det.onnx`, options),
    ort.InferenceSession.create(`${dir}vietocr_encoder.onnx`, options),
    ort.InferenceSession.create(`${dir}vietocr_decoder.onnx`, options),
    fetch(`${dir}vietocr.json`),
  ])
  if (!metaResponse.ok) throw new Error(`vietocr.json HTTP ${metaResponse.status}`)
  meta = (await metaResponse.json()) as VietOcrMeta

  engine = {
    async detect(input, w, h) {
      const out = await det.run({ [det.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, h, w]) })
      return out[det.outputNames[0]].data as Float32Array
    },
    async encode(input, w): Promise<EncodeResult> {
      const out = await encoder.run({ image: new ort.Tensor('float32', input, [1, 3, REC_HEIGHT, w]) })
      const encoderOutputs = out.encoder_outputs.data as Float32Array
      return {
        hidden: out.hidden.data as Float32Array,
        encoderOutputs,
        encoderSteps: encoderOutputs.length / FEATURE_DIM,
      }
    },
    async decodeStep(token, hidden, encoderOutputs, encoderSteps) {
      const out = await decoder.run({
        tgt: new ort.Tensor('int64', BigInt64Array.from([BigInt(token)]), [1]),
        hidden: new ort.Tensor('float32', hidden, [1, hidden.length]),
        encoder_outputs: new ort.Tensor('float32', encoderOutputs, [encoderSteps, 1, FEATURE_DIM]),
      })
      return { logProbs: out.log_probs.data as Float32Array, hidden: out.new_hidden.data as Float32Array }
    },
  }
}

/** Cắt (nếu có) và resize một vùng của bitmap về dw × dh, trả về RGBA. */
function regionRgba(bitmap: ImageBitmap, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number): Uint8ClampedArray {
  const canvas = new OffscreenCanvas(dw, dh)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2D không khả dụng')
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh)
  return ctx.getImageData(0, 0, dw, dh).data
}

async function recognize(requestId: string, image: Blob): Promise<OcrWord[]> {
  if (!engine || !meta) throw new Error('VietOCR chưa khởi tạo')
  const bitmap = await createImageBitmap(image)
  try {
    const det = detectorInputSize(bitmap.width, bitmap.height)
    const boxes = await detectTextBoxes(engine, regionRgba(bitmap, 0, 0, bitmap.width, bitmap.height, det.w, det.h), det.w, det.h)
    const scaleX = bitmap.width / det.w
    const scaleY = bitmap.height / det.h
    const lines: OcrWord[] = []
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]
      const x0 = box.x0 * scaleX
      const y0 = box.y0 * scaleY
      const bw = (box.x1 - box.x0) * scaleX
      const bh = (box.y1 - box.y0) * scaleY
      if (bw >= 1 && bh >= 1) {
        const width = recognizerWidth(meta, bw, bh)
        const tensor = toRecognizerTensor(regionRgba(bitmap, x0, y0, bw, bh, width, REC_HEIGHT), width, REC_HEIGHT)
        const text = (await recognizeLine(engine, meta, tensor, width)).trim()
        if (text !== '') lines.push({ text, x0, y0, x1: x0 + bw, y1: y0 + bh })
      }
      scope.postMessage({ type: 'PROGRESS', requestId, percent: Math.round(((i + 1) / boxes.length) * 100) })
    }
    return lines
  } finally {
    bitmap.close()
  }
}

scope.onmessage = async (event: MessageEvent<VietOcrWorkerRequest>) => {
  const request = event.data
  try {
    if (request.type === 'INIT') {
      await init(request.baseUrl)
      scope.postMessage({ type: 'READY', requestId: request.requestId })
      return
    }
    const lines = await recognize(request.requestId, request.image)
    scope.postMessage({ type: 'RESULT', requestId: request.requestId, lines })
  } catch (err) {
    scope.postMessage({ type: 'ERROR', requestId: request.requestId, message: err instanceof Error ? err.message : String(err) })
  }
}
