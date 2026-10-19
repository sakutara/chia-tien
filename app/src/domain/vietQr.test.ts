import { describe, expect, it } from 'vitest'
import { buildTransferContent, buildVietQrPayload, crc16, sanitizeTransferContent } from './vietQr'

describe('vietQr', () => {
  it('CRC-16/CCITT-FALSE khớp vector chuẩn "123456789" = 29B1', () => {
    expect(crc16('123456789')).toBe('29B1')
  })

  it('payload VietQR có đủ trường và CRC hợp lệ', () => {
    const p = buildVietQrPayload({ bankBin: '970436', accountNumber: '0123456789', amount: 45000, content: 'Binh thanh toan Lau' })
    expect(p.startsWith('000201010212')).toBe(true)
    expect(p).toContain('0010A000000727')
    expect(p).toContain('0006970436')
    expect(p).toContain('01100123456789')
    expect(p).toContain('QRIBFTTA')
    expect(p).toContain('540545000')
    expect(p).toContain('5802VN')
    expect(p).toContain('0819Binh thanh toan Lau')
    expect(p.slice(-8, -4)).toBe('6304')
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)))
  })

  it('nội dung bỏ dấu, bỏ ký tự lạ và cắt còn 50 ký tự', () => {
    expect(buildTransferContent('Bình', 'Lẩu cuối tuần Đà Lạt!')).toBe('Binh thanh toan Lau cuoi tuan Da Lat')
    expect(sanitizeTransferContent('x'.repeat(80))).toHaveLength(50)
  })
})
