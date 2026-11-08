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

/**
 * Tìm các hộp chữ trên bản đồ xác suất (DB rút gọn): vùng liên thông trên ngưỡng, lọc theo điểm trung bình,
 * bbox của vùng được mở rộng theo unclip. Toạ độ trả về cùng hệ với bản đồ.
 */
export function findTextBoxes(prob: Float32Array, w: number, h: number): TextBox[] {
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < prob.length; i++) mask[i] = prob[i] > DET_THRESH ? 1 : 0
  const seen = new Uint8Array(w * h)
  const boxes: TextBox[] = []
  const stack: number[] = []

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    seen[start] = 1
    stack.push(start)
    let x0 = w, y0 = h, x1 = -1, y1 = -1, count = 0, scoreSum = 0
    while (stack.length > 0) {
      const idx = stack.pop() as number
      const x = idx % w
      const y = (idx - x) / w
      count++
      scoreSum += prob[idx]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (x > 0 && mask[idx - 1] && !seen[idx - 1]) { seen[idx - 1] = 1; stack.push(idx - 1) }
      if (x < w - 1 && mask[idx + 1] && !seen[idx + 1]) { seen[idx + 1] = 1; stack.push(idx + 1) }
      if (y > 0 && mask[idx - w] && !seen[idx - w]) { seen[idx - w] = 1; stack.push(idx - w) }
      if (y < h - 1 && mask[idx + w] && !seen[idx + w]) { seen[idx + w] = 1; stack.push(idx + w) }
    }
    if (count < 4 || scoreSum / count < DET_BOX_THRESH) continue
    const bw = x1 - x0 + 1
    const bh = y1 - y0 + 1
    const offset = (bw * bh * DET_UNCLIP) / (2 * (bw + bh))
    boxes.push({
      x0: Math.max(0, x0 - offset),
      y0: Math.max(0, y0 - offset),
      x1: Math.min(w, x1 + 1 + offset),
      y1: Math.min(h, y1 + 1 + offset),
    })
  }
  return boxes
}

/** Phát hiện các dòng chữ trên ảnh RGBA đã resize về (w, h) và trả về hộp trên hệ toạ độ detector. */
export async function detectTextBoxes(engine: VietOcrEngine, rgba: Uint8ClampedArray, w: number, h: number): Promise<TextBox[]> {
  const prob = await engine.detect(toDetectorTensor(rgba, w, h), w, h)
  return findTextBoxes(prob, w, h)
}

function argmax(values: Float32Array): number {
  let best = 0
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i
  return best
}

/** Giải mã tham lam (greedy) từ token SOS cho tới EOS hoặc hết `max_seq_length`. */
export async function greedyDecode(engine: VietOcrEngine, meta: VietOcrMeta, encoded: EncodeResult): Promise<string> {
  let token = meta.sos
  let hidden = encoded.hidden
  const chars: string[] = []
  for (let step = 0; step < meta.max_seq_length; step++) {
    const out = await engine.decodeStep(token, hidden, encoded.encoderOutputs, encoded.encoderSteps)
    hidden = out.hidden
    token = argmax(out.logProbs)
    if (token === meta.eos) break
    const index = token - meta.offset
    if (index >= 0 && index < meta.vocab.length) chars.push(meta.vocab[index])
  }
  return chars.join('')
}

/** Nhận dạng một dòng từ tensor CHW /255 đã đúng chiều cao 32. */
export async function recognizeLine(engine: VietOcrEngine, meta: VietOcrMeta, tensor: Float32Array, width: number): Promise<string> {
  const encoded = await engine.encode(tensor, width)
  return greedyDecode(engine, meta, encoded)
}
