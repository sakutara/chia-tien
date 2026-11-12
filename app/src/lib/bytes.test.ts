import { describe, expect, it } from 'vitest'
import { formatBytes } from './bytes'

describe('formatBytes', () => {
  it('giữ nguyên số byte dưới 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('đổi sang KB làm tròn, không có số thập phân', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(180 * 1024)).toBe('180 KB')
  })

  it('đổi sang MB một chữ số thập phân, dùng dấu phẩy kiểu Việt', () => {
    expect(formatBytes(Math.round(4.2 * 1024 * 1024))).toBe('4,2 MB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10,0 MB')
  })

  // Lỗi thật nghi ngờ: 1023,5 KB được làm tròn thành "1024 KB" thay vì chuyển sang MB.
  it('không hiện "1024 KB" ở ngay trước ngưỡng 1 MB (LỖI NGHI NGỜ: src/lib/bytes.ts)', () => {
    expect(formatBytes(1024 * 1024 - 1)).not.toBe('1024 KB')
  })
})
