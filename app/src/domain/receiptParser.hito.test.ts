import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'

/** Bill Hito Sushi (ảnh chụp 24-10-2026): món đánh số, tên món xuống dòng, gạch đứt nối giữa các món, tên quán ở trên cùng. */
const HITO = [
  'HITO SUSHI',
  '38 Điện Biên Phủ, Phường Gia Định, Hồ Chí Minh,',
  'Việt Nam',
  '0767265268 - 0908268450',
  'PHIẾU TẠM TÍNH',
  'Số HĐ: 2602002242',
  'Số order: 1.11',
  'Ngày: 24/10/2026 (19:39 - 20:49)',
  'Bàn: 1',
  'Phục vụ: Tô Huỳnh Bảo Châu Tô Huỳnh Bảo Châu',
  'Thu ngân: Tô Huỳnh Bảo Châu Tô Huỳnh Bảo Châu',
  'Tên món        SL     ĐG     Thành tiền',
  '1. SALMON       3     99.000    297.000',
  'SASIMI',
  '- - - - - - - - - - - - - - - - - - - -',
  '2. TUNA SASHIMI  1  99.000  99.000',
  '-----------------------------------------',
  '3. NISHIN SASHIMI  1  119.000  119.000',
  '-----------------------------------------',
  '4. UNAGI SPECIAL  1  139.000  139.000',
  'ROLL',
  '-----------------------------------------',
  '5. HITO ROLL  1  139.000  139.000',
  '-----------------------------------------',
  '6. JAPANESE  2  159.000  318.000',
  'STEAK DONBURI',
  '-----------------------------------------',
  '7. UNAGI DONBURI  1  159.000  159.000',
  '-----------------------------------------',
  '8 Trà đào cam sả  1  35.000  35.000',
  '-----------------------------------------',
  '9 OKONOMIYAKI  1  39.000  39.000',
  '(BÁNH XÈO NHẬT)',
  '-----------------------------------------',
  '10 EBI TEMPURA  1  79.000  79.000',
  '(TÔM CHIÊN BỘT)',
  '-----------------------------------------',
  '11. Coke  2  22.000  44.000',
  '-----------------------------------------',
  '12. Soda việt quất  1  35.000  35.000',
  '-----------------------------------------',
  '13. Miso Soup  4  15.000  60.000',
  '-----------------------------------------',
  'Tiền hàng 1.562.000đ',
  'Tổng thanh toán 1.562.000đ',
].join('\n')

describe('bill Hito Sushi: STT, gạch phân cách, tên món xuống dòng', () => {
  const parsed = parseReceipt(HITO)

  it('tên quán ở trên cùng, ngày order', () => {
    expect(parsed.vendorName).toBe('HITO SUSHI')
    expect(parsed.invoiceDate).toBe('2026-10-24')
  })

  it('bỏ STT khỏi tên, ghép dòng tên bị xuống dòng vào đúng món', () => {
    expect(parsed.items.map((i) => i.name)).toEqual([
      'SALMON SASIMI',
      'TUNA SASHIMI',
      'NISHIN SASHIMI',
      'UNAGI SPECIAL ROLL',
      'HITO ROLL',
      'JAPANESE STEAK DONBURI',
      'UNAGI DONBURI',
      'Trà đào cam sả',
      'OKONOMIYAKI (BÁNH XÈO NHẬT)',
      'EBI TEMPURA (TÔM CHIÊN BỘT)',
      'Coke',
      'Soda việt quất',
      'Miso Soup',
    ])
    expect(parsed.items.map((i) => i.quantity)).toEqual([3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 4])
    expect(parsed.items.every((i) => !i.uncertain)).toBe(true)
  })

  it('tổng khớp, STT 13 cho biết đủ 13 món', () => {
    expect(parsed.billTotal).toBe(1_562_000)
    expect(parsed.items.reduce((s, i) => s + i.rawAmount, 0)).toBe(1_562_000)
    expect(parsed.tableRows).toEqual({ expected: 13, read: 13, unread: [] })
  })

  it('không có gạch phân cách vẫn chia đúng nhờ STT', () => {
    const noDash = parseReceipt(HITO.split('\n').filter((l) => !/^[-\s]+$/.test(l)).join('\n'))
    expect(noDash.items.map((i) => i.name)).toEqual(parsed.items.map((i) => i.name))
  })

  it('thiếu một dòng món thì báo thiếu theo STT', () => {
    const missing = parseReceipt(HITO.replace('7. UNAGI DONBURI  1  159.000  159.000', '7. UNAGI DONBURI'))
    expect(missing.tableRows?.expected).toBe(13)
    expect(missing.tableRows?.unread).toHaveLength(1)
  })
})
