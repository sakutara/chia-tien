/*
 * Web Worker chạy VietOCR ONNX (repo duchoa1297/vietocr-onnx): detector DB + encoder/decoder vgg_seq2seq.
 * Worker giữ session trong RAM giữa các lần quét và được terminate khi rảnh hoặc khi rời màn (memoryLifecycle).
 * Giao thức: `VietOcrWorkerRequest` / `VietOcrWorkerResponse`.
 */
import * as ort from 'onnxruntime-web/wasm'
import {
  chooseOrientation,
  detectProbability,
  detectorInputSize,
  estimateSkewAngle,
  findTextBoxes,
  GATE_MEAN_CONF,
  orientationMean,
  recognizeLineScored,
  recognizerWidth,
  SKEW_MIN_DEGREES,
  toRecognizerTensor,
  type EncodeResult,
  type OrientationScore,
  type Rotation,
  type VietOcrEngine,
  type VietOcrMeta,
} from '../domain/vietOcr'
import type { OcrWord } from '../domain/ocrLayout'
import type { VietOcrWorkerRequest, VietOcrWorkerResponse } from '../services/workerContracts'

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

/** Cắt (nếu có) và resize một vùng của ảnh nguồn về dw × dh, trả về RGBA. Thu nhỏ bằng lọc chất lượng cao để chữ mượt. */
function regionRgba(source: ImageBitmap | OffscreenCanvas, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number): Uint8ClampedArray {
  const canvas = new OffscreenCanvas(dw, dh)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2D không khả dụng')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh)
  return ctx.getImageData(0, 0, dw, dh).data
}

/** Xoay ảnh quanh tâm để làm thẳng dòng chữ (góc dương là nghiêng theo chiều kim đồng hồ, nên xoay ngược lại); nền trắng. */
function straighten(source: ImageBitmap | OffscreenCanvas, angle: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(source.width, source.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2D không khả dụng')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, source.width, source.height)
  ctx.translate(source.width / 2, source.height / 2)
  ctx.rotate((-angle * Math.PI) / 180)
  ctx.drawImage(source, -source.width / 2, -source.height / 2)
  return canvas
}

/** Xoay ảnh quanh tâm theo bội 90° (90° và 270° hoán đổi chiều rộng và chiều cao); nền trắng. */
function rotateBitmap(bitmap: ImageBitmap, rotation: Rotation): OffscreenCanvas {
  const quarter = rotation === 90 || rotation === 270
  const width = quarter ? bitmap.height : bitmap.width
  const height = quarter ? bitmap.width : bitmap.height
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2D không khả dụng')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.translate(width / 2, height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  return canvas
}

/** Ảnh (gốc hoặc đã xoay) cùng bản đồ xác suất của detector trên ảnh đó. */
interface OrientedProbe {
  source: ImageBitmap | OffscreenCanvas
  det: { w: number; h: number }
  prob: Float32Array
}

async function probeSource(detEngine: VietOcrEngine, source: ImageBitmap | OffscreenCanvas): Promise<OrientedProbe> {
  const det = detectorInputSize(source.width, source.height)
  const prob = await detectProbability(detEngine, regionRgba(source, 0, 0, source.width, source.height, det.w, det.h), det.w, det.h)
  return { source, det, prob }
}

/** Kết quả nhận dạng toàn bộ hộp chữ của một ảnh (một hướng): dòng chữ, tổng điểm tin cậy và số hộp dò được. */
interface Pass extends OrientedProbe {
  lines: OcrWord[]
  conf: number
  boxes: number
}

/** Nhận dạng mọi hộp chữ trên ảnh đã dò; cộng dồn điểm tin cậy và báo tiến độ theo từng hộp. */
async function readPass(requestId: string, probe: OrientedProbe): Promise<Pass> {
  if (!engine || !meta) throw new Error('VietOCR chưa khởi tạo')
  const { source, det, prob } = probe
  const boxes = findTextBoxes(prob, det.w, det.h)
  const scaleX = source.width / det.w
  const scaleY = source.height / det.h
  const lines: OcrWord[] = []
  let conf = 0
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i]
    const x0 = box.x0 * scaleX
    const y0 = box.y0 * scaleY
    const bw = (box.x1 - box.x0) * scaleX
    const bh = (box.y1 - box.y0) * scaleY
    if (bw >= 1 && bh >= 1) {
      const width = recognizerWidth(meta, bw, bh)
      const tensor = toRecognizerTensor(regionRgba(source, x0, y0, bw, bh, width, REC_HEIGHT), width, REC_HEIGHT)
      const result = await recognizeLineScored(engine, meta, tensor, width)
      conf += result.confidence
      const text = result.text.trim()
      if (text !== '') lines.push({ text, x0, y0, x1: x0 + bw, y1: y0 + bh })
    }
    scope.postMessage({ type: 'PROGRESS', requestId, percent: Math.round(((i + 1) / boxes.length) * 100) })
  }
  return { ...probe, lines, conf, boxes: boxes.length }
}

function scoreOf(pass: Pass): OrientationScore {
  return { conf: pass.conf, boxes: pass.boxes }
}

async function recognize(requestId: string, image: Blob): Promise<OcrWord[]> {
  if (!engine) throw new Error('VietOCR chưa khởi tạo')
  const bitmap = await createImageBitmap(image)
  try {
    // Nhận dạng toàn bộ hộp ở 0°. Nếu điểm trung bình đạt GATE_MEAN_CONF thì giữ 0° và dùng luôn kết quả này.
    const upright = await readPass(requestId, await probeSource(engine, bitmap))
    let chosen = upright
    const scores: Record<Rotation, OrientationScore> = { 0: scoreOf(upright), 90: { conf: 0, boxes: 0 }, 180: { conf: 0, boxes: 0 }, 270: { conf: 0, boxes: 0 } }
    if (orientationMean(scores[0]) < GATE_MEAN_CONF) {
      // Bill nghiêng: nhận dạng toàn bộ hộp ở 90°, 180°, 270° rồi chọn theo tổng điểm tin cậy.
      const rotatedPasses = new Map<Rotation, Pass>()
      for (const rotation of [90, 180, 270] as const) {
        const pass = await readPass(requestId, await probeSource(engine, rotateBitmap(bitmap, rotation)))
        rotatedPasses.set(rotation, pass)
        scores[rotation] = scoreOf(pass)
      }
      const rotation = chooseOrientation(scores)
      if (rotation !== 0) {
        const picked = rotatedPasses.get(rotation)
        if (picked) chosen = picked
      }
    }
    // Nghiêng đáng kể thì nắn góc rồi nhận dạng lại trên ảnh đã nắn; không thì dùng kết quả đã có của hướng được chọn.
    const angle = estimateSkewAngle(chosen.prob, chosen.det.w, chosen.det.h)
    if (Math.abs(angle) >= SKEW_MIN_DEGREES) {
      const straightened = straighten(chosen.source, angle)
      const probe = await probeSource(engine, straightened)
      return (await readPass(requestId, probe)).lines
    }
    return chosen.lines
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
