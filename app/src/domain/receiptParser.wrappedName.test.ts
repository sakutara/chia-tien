import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'

// Hồi quy: khi tên món bị xuống dòng (một dòng chỉ có chữ chen giữa dòng món và dòng đơn giá),
// phần tên xuống dòng phải được nối vào món phía trên, không tách thành hai món.

// Bill OCR thật (văn bản nguyên gốc, giữ nguyên từng ký tự, kể cả hai khoảng trắng giữa các cột).
const BILL_COM_NIEU = `Jhanky
Poweredby O Chamlaco
CƠM NIỀU ĐỆ NHẤT CN3
6 Nguyễn Quý Đức, P An Phú, TP Thú Đức
SĐT: 0909142640
HÓA ĐƠN TẠM TÍNH
Dùng tại quán:  SẢNH LỚN - 8
Phục vụ bởi:  A. Cường
Giờ vào:  14-11-2026 11:37
Giờ in:  14-11-2026 11:50
Mặt hàng  Đơn vị SL  Số f
Cơm niêu  4  60,0
15,000
Khăn Lạnh  4  8,000
2,000
trà xanh nhà nấu  4  12,000
3,000
3chỉ luộc cá pháo  1  105,000
105,000
Mực Sốt Chua  1  100,000
Ngọt
100,000
Cánh gà chiên  85,000
mắm/cháy tỏi(N)
85,000
Trứng Chiên Thịt  1  55,000
55,000
Canh Cải thịt/  1  80,000
bầu(L)
80,000
Tổng  505,000`

const pick = (text: string) => parseReceipt(text).items.map((item) => [item.name, item.quantity, item.unitPrice, item.rawAmount])

describe('tên món bị xuống dòng', () => {
  it('nối phần tên xuống dòng vào món phía trên, không tách thành hai món', () => {
    // "Cơm niêu" không có trong kết quả vì thành tiền bị lem mực thành "60,0". Đây là chủ ý.
    expect(pick(BILL_COM_NIEU)).toEqual([
      ['Khăn Lạnh', 4, 2000, 8000],
      ['trà xanh nhà nấu', 4, 3000, 12000],
      ['3chỉ luộc cá pháo', 1, 105000, 105000],
      ['Mực Sốt Chua Ngọt', 1, 100000, 100000],
      ['Cánh gà chiên mắm/cháy tỏi(N)', 1, 85000, 85000],
      ['Trứng Chiên Thịt', 1, 55000, 55000],
      ['Canh Cải thịt bầu(L)', 1, 80000, 80000],
    ])
  })

  it('tên xuống hai dòng được nối thành một món', () => {
    const text = `Mặt hàng  SL  Số tiền
Gà nướng  2  300,000
muối ớt
nguyên con
150,000
Tổng  300,000`
    expect(pick(text)).toEqual([['Gà nướng muối ớt nguyên con', 2, 150000, 300000]])
  })

  it('bill dạng tên trên, số tiền dưới vẫn là các món riêng', () => {
    const text = `Cà phê sữa
25,000
Trà đào
25,000
Tổng  50,000`
    expect(pick(text)).toEqual([
      ['Cà phê sữa', 1, 25000, 25000],
      ['Trà đào', 1, 25000, 25000],
    ])
  })

  it('dòng chữ không khớp đơn giá thì không nối', () => {
    const text = `Mặt hàng  SL  Số tiền
Bia Tiger  2  40,000
Lẩu thái
150,000
Tổng  190,000`
    expect(pick(text)).toEqual([
      ['Bia Tiger', 2, 20000, 40000],
      ['Lẩu thái', 1, 150000, 150000],
    ])
  })

  it('hai món kế nhau cùng số lượng, cùng giá: có dòng giá không thuộc dòng món nào thì không nối', () => {
    // "30,000" không có dòng món phía trên: bill không in đơn giá ở dòng dưới, nên "Trà đào" là món riêng dù trùng giá "Cà phê sữa".
    const text = `Cà phê sữa  1  25,000
Trà đào
25,000
Bạc xỉu
30,000
Tổng  80,000`
    expect(pick(text)).toEqual([
      ['Cà phê sữa', 1, 25000, 25000],
      ['Trà đào', 1, 25000, 25000],
      ['Bạc xỉu', 1, 30000, 30000],
    ])
  })
})

describe('dòng "Tổng" đứng riêng', () => {
  it('một dòng "Tổng" duy nhất là tổng bill', () => {
    expect(parseReceipt(BILL_COM_NIEU).billTotal).toBe(505000)
  })

  it('còn giảm giá phía dưới thì "Tổng" là tiền hàng, không phải tổng bill', () => {
    const parsed = parseReceipt(`Phở bò  2  120,000
Tổng  120,000
Giảm giá  20,000`)
    expect(parsed.billTotal).toBeUndefined()
    expect(parsed.billSubtotal).toBe(120000)
  })
})
