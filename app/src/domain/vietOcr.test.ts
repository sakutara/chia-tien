import { describe, expect, it } from 'vitest'
import {
  detectorInputSize,
  detectProbability,
  detectTextBoxes,
  estimateSkewAngle,
  findTextBoxes,
  greedyDecode,
  recognizerWidth,
  toDetectorTensor,
  toRecognizerTensor,
  type EncodeResult,
  type VietOcrEngine,
  type VietOcrMeta,
} from './vietOcr'

const meta: VietOcrMeta = {
  image_height: 32,
  image_min_width: 32,
  image_max_width: 512,
  max_seq_length: 16,
  sos: 1,
  eos: 2,
  offset: 4,
  vocab: 'abc ',
}

describe('kích thước đầu vào', () => {
  it('detector: cạnh lớn nhất tối đa 960, hai cạnh là bội số của 32', () => {
    expect(detectorInputSize(1920, 1080)).toEqual({ w: 960, h: 544 })
    expect(detectorInputSize(600, 400)).toEqual({ w: 608, h: 416 })
  })

  it('recognizer: làm tròn lên bội 10 theo bản Python và kẹp min/max', () => {
    // 32 × 200 / 50 = 128 → 130 trong bản Python (ceil(128/10)*10); 32 × 1000 / 10 → kẹp về 512
    expect(recognizerWidth(meta, 200, 50)).toBe(130)
    expect(recognizerWidth(meta, 1000, 10)).toBe(512)
    expect(recognizerWidth(meta, 10, 100)).toBe(32)
  })
})

describe('tensor', () => {
  it('detector: chuẩn hoá ImageNet, xếp theo kênh CHW', () => {
    // Một pixel trắng (255,255,255,255) và một pixel đen, kích thước 2×1
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])
    const out = toDetectorTensor(rgba, 2, 1)
    expect(out[0]).toBeCloseTo((1 - 0.485) / 0.229, 5) // R, pixel 0
    expect(out[1]).toBeCloseTo(-0.485 / 0.229, 5) // R, pixel 1
    expect(out[2]).toBeCloseTo((1 - 0.456) / 0.224, 5) // G, pixel 0
  })

  it('recognizer: chỉ chia 255, không trừ trung bình', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255])
    const out = toRecognizerTensor(rgba, 1, 1)
    expect([...out]).toEqual([1, 0, 0])
  })
})

describe('findTextBoxes (DB rút gọn)', () => {
  it('tách hai vùng liên thông và bỏ vùng có điểm trung bình thấp', () => {
    const w = 40
    const h = 20
    const prob = new Float32Array(w * h)
    // Vùng 1: 10×4 điểm, xác suất 0.9
    for (let y = 2; y < 6; y++) for (let x = 2; x < 12; x++) prob[y * w + x] = 0.9
    // Vùng 2: 10×4 điểm, xác suất 0.4 (qua ngưỡng 0.3 nhưng điểm trung bình < 0.5)
    for (let y = 12; y < 16; y++) for (let x = 20; x < 30; x++) prob[y * w + x] = 0.4
    const boxes = findTextBoxes(prob, w, h)
    expect(boxes).toHaveLength(1)
    expect(boxes[0].x0).toBeLessThanOrEqual(2)
    expect(boxes[0].x1).toBeGreaterThanOrEqual(12)
    expect(boxes[0].y0).toBeLessThanOrEqual(2)
    expect(boxes[0].y1).toBeGreaterThanOrEqual(6)
  })

  it('hộp được mở rộng nhưng không vượt khỏi bản đồ', () => {
    const w = 10
    const h = 6
    const prob = new Float32Array(w * h).fill(0.9)
    const [box] = findTextBoxes(prob, w, h)
    expect(box).toEqual({ x0: 0, y0: 0, x1: 10, y1: 6 })
  })

  it('bản đồ không có vùng nào thì trả về rỗng', () => {
    expect(findTextBoxes(new Float32Array(16), 4, 4)).toEqual([])
  })
})

/** Engine giả: decoder phát ra lần lượt các token đã cho, rồi EOS. */
function fakeEngine(tokens: number[]): VietOcrEngine {
  let i = 0
  const encoded: EncodeResult = { hidden: new Float32Array(4), encoderOutputs: new Float32Array(8), encoderSteps: 2 }
  return {
    detect: async () => new Float32Array(0),
    encode: async () => encoded,
    decodeStep: async () => {
      const token = i < tokens.length ? tokens[i++] : meta.eos
      const logProbs = new Float32Array(meta.offset + meta.vocab.length)
      logProbs[token] = 1
      return { logProbs, hidden: new Float32Array(4) }
    },
  }
}

describe('greedyDecode', () => {
  it('ánh xạ token sang ký tự theo offset và dừng ở EOS', async () => {
    // token 4 = 'a', 5 = 'b', 6 = 'c'
    const text = await greedyDecode(fakeEngine([4, 5, 6]), meta, { hidden: new Float32Array(4), encoderOutputs: new Float32Array(8), encoderSteps: 2 })
    expect(text).toBe('abc')
  })

  it('token không thuộc từ vựng (dưới offset) bị bỏ qua', async () => {
    const text = await greedyDecode(fakeEngine([0, 4, 3]), meta, { hidden: new Float32Array(4), encoderOutputs: new Float32Array(8), encoderSteps: 2 })
    expect(text).toBe('a')
  })

  it('dừng ở max_seq_length nếu mô hình không bao giờ phát EOS', async () => {
    const engine = fakeEngine(new Array(100).fill(4))
    const text = await greedyDecode(engine, meta, { hidden: new Float32Array(4), encoderOutputs: new Float32Array(8), encoderSteps: 2 })
    expect(text).toHaveLength(meta.max_seq_length)
  })
})

/** Vẽ một dải chữ dày ~6 px dài `length`, tâm (cx, cy), nghiêng `angleDeg` (dương là đi xuống về bên phải). */
function drawStripe(prob: Float32Array, w: number, angleDeg: number, cx: number, cy: number, length: number): void {
  const rad = (angleDeg * Math.PI) / 180
  for (let t = -length / 2; t <= length / 2; t += 0.5) {
    const px = Math.round(cx + t * Math.cos(rad))
    const py = Math.round(cy + t * Math.sin(rad))
    for (let dy = -3; dy < 3; dy++) for (let dx = -3; dx < 3; dx++) prob[(py + dy) * w + px + dx] = 0.9
  }
}

describe('estimateSkewAngle', () => {
  const w = 400
  const h = 300

  it('dải nằm ngang cho góc ≈ 0', () => {
    const prob = new Float32Array(w * h)
    for (const cy of [50, 100, 150, 200]) drawStripe(prob, w, 0, 200, cy, 200)
    expect(Math.abs(estimateSkewAngle(prob, w, h))).toBeLessThan(0.3)
  })

  it('dải nghiêng +5° (xuống về phải) cho ≈ +5', () => {
    const prob = new Float32Array(w * h)
    for (const cy of [60, 110, 160, 210]) drawStripe(prob, w, 5, 200, cy, 200)
    expect(Math.abs(estimateSkewAngle(prob, w, h) - 5)).toBeLessThan(0.7)
  })

  it('dải nghiêng −8° (lên về phải) cho ≈ −8', () => {
    const prob = new Float32Array(w * h)
    for (const cy of [60, 110, 160, 210]) drawStripe(prob, w, -8, 200, cy, 200)
    expect(Math.abs(estimateSkewAngle(prob, w, h) + 8)).toBeLessThan(0.7)
  })

  it('ít hơn 3 vùng dài thì trả về 0', () => {
    const prob = new Float32Array(w * h)
    drawStripe(prob, w, 5, 200, 80, 200)
    drawStripe(prob, w, 5, 200, 180, 200)
    expect(estimateSkewAngle(prob, w, h)).toBe(0)
  })

  it('bỏ qua vùng gần vuông (không dài)', () => {
    const prob = new Float32Array(w * h)
    for (const cy of [60, 110, 160]) drawStripe(prob, w, 5, 200, cy, 200)
    // Khối vuông 20×20 ở góc, không được tính vào góc của dòng chữ
    for (let y = 250; y < 270; y++) for (let x = 40; x < 60; x++) prob[y * w + x] = 0.9
    expect(Math.abs(estimateSkewAngle(prob, w, h) - 5)).toBeLessThan(0.7)
  })
})

describe('detectProbability', () => {
  it('chạy detector với tensor đúng kích thước và trả về bản đồ của engine', async () => {
    let inputLength = 0
    const engine: VietOcrEngine = {
      ...fakeEngine([]),
      detect: async (input, w, h) => {
        inputLength = input.length
        return new Float32Array(w * h).fill(0.7)
      },
    }
    const prob = await detectProbability(engine, new Uint8ClampedArray(4 * 4 * 4), 4, 4)
    expect(inputLength).toBe(3 * 4 * 4)
    expect(prob).toHaveLength(16)
    expect(prob[0]).toBeCloseTo(0.7)
  })
})

describe('detectTextBoxes', () => {
  it('lấy bản đồ từ engine rồi tìm hộp', async () => {
    const engine: VietOcrEngine = {
      ...fakeEngine([]),
      detect: async (_input, w, h) => {
        const prob = new Float32Array(w * h)
        prob[w + 1] = 0.9
        prob[w + 2] = 0.9
        prob[w * 2 + 1] = 0.9
        prob[w * 2 + 2] = 0.9
        return prob
      },
    }
    const boxes = await detectTextBoxes(engine, new Uint8ClampedArray(4 * 4 * 4), 4, 4)
    expect(boxes).toHaveLength(1)
  })
})
