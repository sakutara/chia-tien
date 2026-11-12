/*
 * Lõi thuần của VietOCR ONNX (repo duchoa1297/vietocr-onnx): tiền xử lý tensor, phát hiện vùng chữ (DB), và giải mã tham lam.
 * Không đụng DOM hay runtime ONNX: worker truyền vào một `VietOcrEngine` đã bọc session của onnxruntime-web.
 */

/** Thông số trong `vietocr.json`. */
export interface VietOcrMeta {
  image_height: number
  image_min_width: number
  image_max_width: number
  max_seq_length: number
  sos: number
  eos: number
  offset: number
  vocab: string
}

/** Hộp chữ trên ảnh, toạ độ pixel. */
export interface TextBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Kết quả encoder: trạng thái ẩn đầu tiên và đặc trưng cho decoder (t bước, 1 batch, 512 chiều). */
export interface EncodeResult {
  hidden: Float32Array
  encoderOutputs: Float32Array
  encoderSteps: number
}

/** Bọc các session ONNX mà worker cung cấp. */
export interface VietOcrEngine {
  /** Chạy detector trên tensor CHW đã chuẩn hoá, trả về bản đồ xác suất (w × h). */
  detect(input: Float32Array, w: number, h: number): Promise<Float32Array>
  /** Chạy encoder trên tensor CHW /255 có chiều cao 32 và chiều rộng `w`. */
  encode(input: Float32Array, w: number): Promise<EncodeResult>
  /** Một bước giải mã: token trước + trạng thái ẩn → log-xác suất từng token và trạng thái ẩn mới. */
  decodeStep(token: number, hidden: Float32Array, encoderOutputs: Float32Array, encoderSteps: number): Promise<{ logProbs: Float32Array; hidden: Float32Array }>
}

/** Cạnh lớn nhất của ảnh đưa vào detector (giống DBNet của PaddleOCR). */
export const DET_LIMIT_SIDE = 960
/** Ngưỡng xác suất để một pixel thuộc chữ. */
export const DET_THRESH = 0.3
/** Điểm trung bình tối thiểu của một vùng để nhận là chữ. */
export const DET_BOX_THRESH = 0.5
/** Góc nghiêng (độ) dưới ngưỡng này thì không xoay. */
export const SKEW_MIN_DEGREES = 0.5
/** Góc nghiêng tối đa được sửa; lớn hơn coi như ước lượng sai. */
export const SKEW_MAX_DEGREES = 30
/** Hệ số mở rộng hộp (unclip) để bao trọn dấu tiếng Việt. */
export const DET_UNCLIP = 2.0
/** Chuẩn hoá ImageNet cho detector (PaddleOCR DB). */
const DET_MEAN = [0.485, 0.456, 0.406]
const DET_STD = [0.229, 0.224, 0.225]

/** Kích thước đầu vào detector: giữ tỉ lệ, cạnh lớn nhất ≤ 960, hai cạnh là bội số của 32. */
export function detectorInputSize(width: number, height: number): { w: number; h: number } {
  const scale = Math.min(1, DET_LIMIT_SIDE / Math.max(width, height))
  const snap = (v: number) => Math.max(32, Math.round((v * scale) / 32) * 32)
  return { w: snap(width), h: snap(height) }
}

/** RGBA (đã resize về w × h) → tensor CHW đã chuẩn hoá cho detector. */
export function toDetectorTensor(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const out = new Float32Array(3 * w * h)
  const plane = w * h
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      out[c * plane + i] = (rgba[i * 4 + c] / 255 - DET_MEAN[c]) / DET_STD[c]
    }
  }
  return out
}

/** Chiều rộng đầu vào của recognizer cho một dòng (giống bản Python: cắt phần nguyên, làm tròn lên bội 10, kẹp min/max). */
export function recognizerWidth(meta: VietOcrMeta, width: number, height: number): number {
  const scaled = Math.trunc((meta.image_height * width) / height)
  const rounded = Math.ceil(scaled / 10) * 10
  return Math.min(Math.max(rounded, meta.image_min_width), meta.image_max_width)
}

/** RGBA (đã resize về w × 32) → tensor CHW /255 cho encoder. */
export function toRecognizerTensor(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const out = new Float32Array(3 * w * h)
  const plane = w * h
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) out[c * plane + i] = rgba[i * 4 + c] / 255
  }
  return out
}

/** Vùng liên thông trên ngưỡng, kèm tổng để tính điểm trung bình và mô-men để đo hướng (toạ độ pixel trên bản đồ). */
interface Component {
  x0: number
  y0: number
  x1: number
  y1: number
  count: number
  scoreSum: number
  sumX: number
  sumY: number
  sumXX: number
  sumYY: number
  sumXY: number
}

/** Duyệt các vùng liên thông (4 hướng) của bản đồ đã ngưỡng hoá, gọi `visit` với từng vùng theo thứ tự quét. */
function forEachComponent(prob: Float32Array, w: number, h: number, visit: (c: Component) => void): void {
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < prob.length; i++) mask[i] = prob[i] > DET_THRESH ? 1 : 0
  const seen = new Uint8Array(w * h)
  const stack: number[] = []

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    seen[start] = 1
    stack.push(start)
    const c: Component = { x0: w, y0: h, x1: -1, y1: -1, count: 0, scoreSum: 0, sumX: 0, sumY: 0, sumXX: 0, sumYY: 0, sumXY: 0 }
    while (stack.length > 0) {
      const idx = stack.pop() as number
      const x = idx % w
      const y = (idx - x) / w
      c.count++
      c.scoreSum += prob[idx]
      c.sumX += x
      c.sumY += y
      c.sumXX += x * x
      c.sumYY += y * y
      c.sumXY += x * y
      if (x < c.x0) c.x0 = x
      if (x > c.x1) c.x1 = x
      if (y < c.y0) c.y0 = y
      if (y > c.y1) c.y1 = y
      if (x > 0 && mask[idx - 1] && !seen[idx - 1]) {
        seen[idx - 1] = 1
        stack.push(idx - 1)
      }
      if (x < w - 1 && mask[idx + 1] && !seen[idx + 1]) {
        seen[idx + 1] = 1
        stack.push(idx + 1)
      }
      if (y > 0 && mask[idx - w] && !seen[idx - w]) {
        seen[idx - w] = 1
        stack.push(idx - w)
      }
      if (y < h - 1 && mask[idx + w] && !seen[idx + w]) {
        seen[idx + w] = 1
        stack.push(idx + w)
      }
    }
    visit(c)
  }
}

/**
 * Tìm các hộp chữ trên bản đồ xác suất (DB rút gọn): vùng liên thông trên ngưỡng, lọc theo điểm trung bình,
 * bbox của vùng được mở rộng theo unclip. Toạ độ trả về cùng hệ với bản đồ.
 */
export function findTextBoxes(prob: Float32Array, w: number, h: number): TextBox[] {
  const boxes: TextBox[] = []
  forEachComponent(prob, w, h, (c) => {
    if (c.count < 4 || c.scoreSum / c.count < DET_BOX_THRESH) return
    const bw = c.x1 - c.x0 + 1
    const bh = c.y1 - c.y0 + 1
    const offset = (bw * bh * DET_UNCLIP) / (2 * (bw + bh))
    boxes.push({
      x0: Math.max(0, c.x0 - offset),
      y0: Math.max(0, c.y0 - offset),
      x1: Math.min(w, c.x1 + 1 + offset),
      y1: Math.min(h, c.y1 + 1 + offset),
    })
  })
  return boxes
}

/** Vùng có ít pixel hơn chừng này thì không đủ để đo hướng. */
const SKEW_MIN_PIXELS = 50
/** Vùng dài: trị riêng lớn gấp chừng này lần trị riêng nhỏ (tỉ lệ dài/rộng ≥ 4). */
const SKEW_ASPECT = 16
/** Số vùng dài tối thiểu để tin vào góc ước lượng. */
const SKEW_MIN_LINES = 3

/**
 * Ước lượng góc nghiêng (độ) của dòng chữ từ các vùng dài trên bản đồ xác suất: trung vị hướng trục chính của
 * những vùng dài. Dương là dòng đi xuống về bên phải (nghiêng theo chiều kim đồng hồ). Không đủ vùng hoặc góc quá lớn thì trả 0.
 */
export function estimateSkewAngle(prob: Float32Array, w: number, h: number): number {
  const angles: number[] = []
  forEachComponent(prob, w, h, (c) => {
    if (c.count < SKEW_MIN_PIXELS) return
    const n = c.count
    const mx = c.sumX / n
    const my = c.sumY / n
    const sxx = c.sumXX / n - mx * mx
    const syy = c.sumYY / n - my * my
    const sxy = c.sumXY / n - mx * my
    const mean = (sxx + syy) / 2
    const spread = Math.hypot((sxx - syy) / 2, sxy)
    const l1 = mean + spread
    const l2 = mean - spread
    if (l1 < SKEW_ASPECT * Math.max(l2, 1e-6)) return
    angles.push((0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI)
  })
  if (angles.length < SKEW_MIN_LINES) return 0
  angles.sort((a, b) => a - b)
  const mid = angles.length >> 1
  const median = angles.length % 2 === 1 ? angles[mid] : (angles[mid - 1] + angles[mid]) / 2
  return Math.abs(median) > SKEW_MAX_DEGREES ? 0 : median
}

/** Các hướng xoay thô (bội 90°) mà bill có thể bị chụp nằm nghiêng. */
export type Rotation = 0 | 90 | 180 | 270

/** Điểm nhận dạng của một hướng: tổng điểm tin cậy các dòng và số hộp chữ được dò. */
export interface OrientationScore {
  conf: number
  boxes: number
}

/** Điểm trung bình của hướng 0° phải đạt ngưỡng này thì giữ 0°, không thử hướng khác. */
export const GATE_MEAN_CONF = 0.6
/** Hướng khác phải có tổng điểm cao hơn 0° ít nhất hệ số này (20%) mới được đổi. */
export const ORIENTATION_MARGIN = 1.2

/** Điểm trung bình một hộp của một hướng (tổng điểm chia số hộp; 0 hộp thì 0). */
export function orientationMean(score: OrientationScore): number {
  return score.boxes > 0 ? score.conf / score.boxes : 0
}

/**
 * Chọn hướng xoay thô của bill theo điểm tin cậy nhận dạng (không theo số hộp, vì bộ dò tìm nhiều hộp ở mọi hướng).
 * Nếu điểm trung bình của 0° đạt `gateMean` thì giữ 0°. Ngược lại, trong 90°, 180°, 270° chọn hướng có tổng điểm cao nhất
 * (hòa thì ưu tiên 90°, rồi 180°, 270°); chỉ đổi khi tổng điểm đó lớn hơn tổng điểm 0° × `margin`, nếu không giữ 0°.
 */
export function chooseOrientation(
  scores: Record<Rotation, OrientationScore>,
  opts: { gateMean?: number; margin?: number } = {},
): Rotation {
  const gateMean = opts.gateMean ?? GATE_MEAN_CONF
  const margin = opts.margin ?? ORIENTATION_MARGIN
  const base = scores[0]
  if (orientationMean(base) >= gateMean) return 0
  let best: Rotation = 90
  for (const rotation of [180, 270] as const) {
    if (scores[rotation].conf > scores[best].conf) best = rotation
  }
  return scores[best].conf > base.conf * margin ? best : 0
}

/** Chạy detector trên ảnh RGBA đã resize về (w, h) và trả về bản đồ xác suất (w × h). */
export async function detectProbability(engine: VietOcrEngine, rgba: Uint8ClampedArray, w: number, h: number): Promise<Float32Array> {
  return engine.detect(toDetectorTensor(rgba, w, h), w, h)
}

/** Phát hiện các dòng chữ trên ảnh RGBA đã resize về (w, h) và trả về hộp trên hệ toạ độ detector. */
export async function detectTextBoxes(engine: VietOcrEngine, rgba: Uint8ClampedArray, w: number, h: number): Promise<TextBox[]> {
  return findTextBoxes(await detectProbability(engine, rgba, w, h), w, h)
}

function argmax(values: Float32Array): number {
  let best = 0
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i
  return best
}

/** Bề rộng tối thiểu (pixel, ở chiều cao 32) mà một ký tự chiếm: dùng để chặn số ký tự giải mã theo bề rộng dòng. */
export const MIN_CHAR_WIDTH = 5
/** Một cụm (1–2 từ) lặp liền nhau từ chừng này lần trở lên là ảo giác của decoder, không phải chữ trên bill. */
export const REPEAT_MIN_RUNS = 3

/** Số ký tự tối đa hợp lý của một dòng rộng `width` pixel (ở chiều cao 32). */
export function maxCharsForWidth(meta: VietOcrMeta, width: number): number {
  return Math.min(meta.max_seq_length, Math.ceil(width / MIN_CHAR_WIDTH) + 2)
}

/**
 * Bỏ đoạn lặp vô nghĩa ("Thi Thi Thi Thi…", "thu nha ninh chi thu nha ninh chi…"): decoder rơi vào vòng lặp khi gặp chữ
 * ngoài bảng chữ (tiếng Hàn, logo, mã QR). Cụm 1–4 từ lặp liền ≥ `REPEAT_MIN_RUNS` lần bị xoá cả đoạn; phần còn lại giữ nguyên.
 */
export function stripRepeats(text: string): string {
  const words = text.split(/\s+/).filter((w) => w !== '')
  const out: string[] = []
  let i = 0
  while (i < words.length) {
    let skipped = false
    for (let period = 1; period <= 4 && !skipped; period++) {
      let runs = 1
      while (i + (runs + 1) * period <= words.length && sameWords(words, i, i + runs * period, period)) runs++
      if (runs >= REPEAT_MIN_RUNS) {
        i += runs * period
        // Phần đuôi dở dang của vòng lặp ("… Thi Thi Th").
        while (i < words.length && words[i - period].toLowerCase().startsWith(words[i].toLowerCase())) i++
        skipped = true
      }
    }
    if (!skipped) out.push(words[i++])
  }
  return out.join(' ')
}

function sameWords(words: string[], a: number, b: number, length: number): boolean {
  for (let k = 0; k < length; k++) if (words[a + k].toLowerCase() !== words[b + k].toLowerCase()) return false
  return true
}

/** Kết quả giải mã một dòng kèm điểm tin cậy. */
export interface ScoredText {
  text: string
  /** Trung bình, qua các bước giải mã, của xác suất token lớn nhất (exp của log-xác suất). */
  confidence: number
}

/**
 * Giải mã tham lam (greedy) từ token SOS cho tới EOS hoặc hết `maxChars`, đồng thời tính điểm tin cậy:
 * trung bình xác suất token lớn nhất trên mọi bước đã thực hiện (kể cả bước sinh EOS).
 */
export async function greedyDecodeScored(engine: VietOcrEngine, meta: VietOcrMeta, encoded: EncodeResult, maxChars: number = meta.max_seq_length): Promise<ScoredText> {
  let token = meta.sos
  let hidden = encoded.hidden
  const chars: string[] = []
  let probSum = 0
  let steps = 0
  for (let step = 0; step < maxChars; step++) {
    const out = await engine.decodeStep(token, hidden, encoded.encoderOutputs, encoded.encoderSteps)
    hidden = out.hidden
    token = argmax(out.logProbs)
    probSum += Math.exp(out.logProbs[token])
    steps++
    if (token === meta.eos) break
    const index = token - meta.offset
    if (index >= 0 && index < meta.vocab.length) chars.push(meta.vocab[index])
  }
  return { text: chars.join(''), confidence: steps > 0 ? probSum / steps : 0 }
}

/** Giải mã tham lam (greedy) từ token SOS cho tới EOS hoặc hết `maxChars` (mặc định `max_seq_length`). */
export async function greedyDecode(engine: VietOcrEngine, meta: VietOcrMeta, encoded: EncodeResult, maxChars: number = meta.max_seq_length): Promise<string> {
  return (await greedyDecodeScored(engine, meta, encoded, maxChars)).text
}

/** Nhận dạng một dòng kèm điểm tin cậy; text giống hệt `recognizeLine`. */
export async function recognizeLineScored(engine: VietOcrEngine, meta: VietOcrMeta, tensor: Float32Array, width: number): Promise<ScoredText> {
  const encoded = await engine.encode(tensor, width)
  const decoded = await greedyDecodeScored(engine, meta, encoded, maxCharsForWidth(meta, width))
  return { text: stripRepeats(decoded.text), confidence: decoded.confidence }
}

/** Nhận dạng một dòng từ tensor CHW /255 đã đúng chiều cao 32; số ký tự bị chặn theo bề rộng và đoạn lặp ảo giác bị bỏ. */
export async function recognizeLine(engine: VietOcrEngine, meta: VietOcrMeta, tensor: Float32Array, width: number): Promise<string> {
  return (await recognizeLineScored(engine, meta, tensor, width)).text
}
