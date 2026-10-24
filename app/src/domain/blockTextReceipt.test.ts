import { describe, expect, it } from 'vitest'
import { reflowBlockText } from './blockTextReceipt'
import { parseReceipt } from './receiptParser'
import { validateReceipt } from './receiptValidation'

/** Bill Hito Sushi copy từ AI ngoài: mỗi ô bảng một dòng, SL đọc sai ở vài món, ô số đứng trước tên món. */
const BLOCK = `HITO SUSHI
38 Điện Biên Phủ, Phường Gia Định, Ho Chí Mtinh Việt Nam 0767265268-0908268450
PHIẾU TAM TÍNH Sơ HĐ: 2602002242
So order: 1.11 Ngày:24/10/2026 (19:39-20:49 Bàn:1
Phục vụ: Tô Huỳnh Báo Cháu Tô Huỳnh Bảo Châu Thu ngân: Tô Huỳnh Bao Châu Tô Huỳnh Bảo Châu
SL
ĐG
Thành tiền
Tên món
3
99.000
1.SALMON SASHIMI
7
99.000
99.000
2. TUNA SASHIM
1
119.000
119000
3. NISHIN SASHIM
1
139.000
139.000
4. UNAGI SPECIAL ROLL
139.000
139.000
1 2
5. HITO ROLL
159.000
318.000
6. JAPANESE STEAK DONBUR
159.000
159.000
7 UNAGI DONBUR
1
35.000
35.000
8 Trà dào cam sa
39000
39.000
|9 OKONOMIYAKI (BÁNH XÈO NHÁT)
79.000
79.000
10 EBI TEMPURA (TÔM CHIËN BỘT)
1
22.000
44.000
11.Coke
2
35.000
35.000
12 Soda việt quát
1
13. Miso Soup 4
60.000
15000
Tiên hàng Tổng thanh toán
1.562.000d 1.562.000đ
1.562.000d
Còn phái thu
Hito Sushi xin cảm ơn ⁃ vui lông kiếm tra truớc khi thanh toán!
CUKCUK-Một sản phẩm cửa MISA`

describe('reflowBlockText: văn bản dán xuống dòng theo khối', () => {
  it('ghép ô số vào đúng món, SL lấy theo thành tiền ÷ đơn giá', () => {
    const parsed = parseReceipt(reflowBlockText(BLOCK))
    expect(parsed.items.map((i) => [i.quantity, i.unitPrice, i.rawAmount])).toEqual([
      [3, 99000, 297000],
      [1, 99000, 99000],
      [1, 119000, 119000],
      [1, 139000, 139000],
      [1, 139000, 139000],
      [2, 159000, 318000],
      [1, 159000, 159000],
      [1, 35000, 35000],
      [1, 39000, 39000],
      [1, 79000, 79000],
      [2, 22000, 44000],
      [1, 35000, 35000],
      [4, 15000, 60000],
    ])
    expect(parsed.items.map((i) => i.name)[12]).toBe('Miso Soup')
    expect(parsed.vendorName).toBe('HITO SUSHI')
    expect(parsed.invoiceDate).toBe('2026-10-24')
  })

  it('tổng các món khớp tổng bill', () => {
    const check = validateReceipt(parseReceipt(reflowBlockText(BLOCK)), reflowBlockText(BLOCK))
    expect(check.receipt.billTotal).toBe(1_562_000)
    expect(check.receipt.items.reduce((s, i) => s + i.rawAmount, 0)).toBe(1_562_000)
    expect(check.status).toBe('OK')
  })

  it('không phải bố cục khối thì giữ nguyên văn', () => {
    const plain = 'QUÁN A\n1. Phở  2  50.000  100.000\nTổng 100.000'
    expect(reflowBlockText(plain)).toBe(plain)
  })
})
