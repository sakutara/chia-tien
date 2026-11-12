import { describe, expect, it } from 'vitest'
import { chooseOrientation, recognizeLine, recognizeLineScored, type OrientationScore, type VietOcrEngine, type VietOcrMeta } from './vietOcr'

const zero: OrientationScore = { conf: 0, boxes: 0 }

function scores(s0: OrientationScore, s90 = zero, s180 = zero, s270 = zero) {
  return { 0: s0, 90: s90, 180: s180, 270: s270 } as const
}

describe('chooseOrientation (theo điểm tin cậy)', () => {
  it('giữ 0° khi điểm trung bình của 0° >= 0,6 dù các hướng khác cao hơn', () => {
    expect(chooseOrientation(scores({ conf: 9, boxes: 10 }, { conf: 50, boxes: 10 }, { conf: 50, boxes: 10 }, { conf: 50, boxes: 10 }))).toBe(0)
  })

  it('xoay sang 90° khi 0° trung bình thấp và 90° cao hơn 0° ít nhất 20%', () => {
    expect(chooseOrientation(scores({ conf: 3, boxes: 10 }, { conf: 3.7, boxes: 10 }))).toBe(90)
  })

  it('giữ 0° khi hướng tốt nhất chỉ cao hơn 0° 10%', () => {
    expect(chooseOrientation(scores({ conf: 3, boxes: 10 }, { conf: 3.3, boxes: 10 }))).toBe(0)
  })

  it('0° có 0 hộp thì không chia cho 0 và giữ 0° khi không hướng nào có điểm', () => {
    expect(chooseOrientation(scores({ conf: 0, boxes: 0 }))).toBe(0)
  })

  it('chọn 270° khi 270° cao nhất và vượt 0° ít nhất 20%', () => {
    expect(
      chooseOrientation(
        scores({ conf: 3, boxes: 10 }, { conf: 2, boxes: 10 }, { conf: 1, boxes: 10 }, { conf: 4, boxes: 10 }),
      ),
    ).toBe(270)
  })
})

const meta: VietOcrMeta = {
  image_height: 32,
  image_min_width: 32,
  image_max_width: 512,
  max_seq_length: 10,
  sos: 1,
  eos: 2,
  offset: 4,
  vocab: 'ab',
}

/** Phân phối xác suất (6 token) cho từng bước giải mã: token 4 là 'a', 5 là 'b', 2 là EOS. */
const STEPS: number[][] = [
  [0.05, 0.05, 0.05, 0.05, 0.8, 0.0],
  [0.1, 0.1, 0.1, 0.1, 0.1, 0.5],
  [0.02, 0.02, 0.9, 0.02, 0.02, 0.02],
]

/** Engine giả: bước giải mã thứ i trả về phân phối steps[i]. Mỗi lần gọi tạo engine mới. */
function fakeEngine(steps: number[][]): VietOcrEngine {
  let i = 0
  return {
    async detect() {
      throw new Error('không dùng trong test này')
    },
    async encode() {
      return { hidden: new Float32Array(4), encoderOutputs: new Float32Array(4), encoderSteps: 1 }
    },
    async decodeStep() {
      const probs = steps[Math.min(i, steps.length - 1)]
      i++
      return { logProbs: Float32Array.from(probs, Math.log), hidden: new Float32Array(4) }
    },
  }
}

describe('recognizeLineScored', () => {
  it('điểm tin cậy là trung bình exp(log xác suất lớn nhất) qua mọi bước, gồm bước EOS', async () => {
    const result = await recognizeLineScored(fakeEngine(STEPS), meta, new Float32Array(3), 100)
    expect(result.text).toBe('ab')
    expect(result.confidence).toBeCloseTo((0.8 + 0.5 + 0.9) / 3, 5)
  })

  it('text giống recognizeLine', async () => {
    const text = await recognizeLine(fakeEngine(STEPS), meta, new Float32Array(3), 100)
    const scored = await recognizeLineScored(fakeEngine(STEPS), meta, new Float32Array(3), 100)
    expect(text).toBe('ab')
    expect(scored.text).toBe(text)
  })
})
