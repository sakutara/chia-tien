import { describe, expect, it } from 'vitest'
import { ocrScale, stretchContrast } from './imagePreprocess'

describe('stretchContrast', () => {
  it('kéo dải mức xám hẹp ra toàn bộ 0–255', () => {
    const gray = new Uint8ClampedArray([100, 110, 120, 130, 140])
    const out = stretchContrast(gray)
    expect(out[0]).toBe(0)
    expect(out[4]).toBe(255)
    expect(out[2]).toBeGreaterThan(out[1])
  })

  it('ảnh đồng nhất giữ nguyên giá trị', () => {
    const gray = new Uint8ClampedArray([90, 90, 90, 90])
    expect(Array.from(stretchContrast(gray))).toEqual([90, 90, 90, 90])
  })

  it('không đổi mảng gốc', () => {
    const gray = new Uint8ClampedArray([10, 200])
    stretchContrast(gray)
    expect(Array.from(gray)).toEqual([10, 200])
  })
})

describe('ocrScale', () => {
  it('phóng to ảnh bill nhỏ để chữ đủ cao cho Tesseract', () => {
    expect(ocrScale(563, 1289)).toBeCloseTo(2.17, 2)
  })

  it('không phóng quá 3× với ảnh rất nhỏ', () => {
    expect(ocrScale(300, 500)).toBe(3)
  })

  it('thu ảnh chụp quá lớn về cạnh dài mục tiêu', () => {
    expect(ocrScale(3000, 4000)).toBeCloseTo(0.7, 5)
  })
})
