import { describe, expect, it } from 'vitest'
import { pickScanEncoding } from './imageScan'

describe('pickScanEncoding (BR-4.16)', () => {
  it('PNG nếu bản PNG đủ nhẹ', () => {
    expect(pickScanEncoding(300_000)).toBe('png')
    expect(pickScanEncoding(1_000_000)).toBe('png')
  })

  it('JPEG nếu PNG quá nặng hoặc không tạo được PNG', () => {
    expect(pickScanEncoding(1_000_001)).toBe('jpeg')
    expect(pickScanEncoding(null)).toBe('jpeg')
  })

  it('dùng được giới hạn riêng', () => {
    expect(pickScanEncoding(600, 500)).toBe('jpeg')
    expect(pickScanEncoding(400, 500)).toBe('png')
  })
})
